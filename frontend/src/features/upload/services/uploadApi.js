import { deductScan } from '@/features/billing/services/stripeApi.js';
import { apiCall, API_URL, getAuthToken } from '@/services/apiClient';

export const uploadFile = async (file, onProgress, metadata = {}) => {
    // Step 1: Get presigned URL from our API with original filename and metadata
    // Use customFileName if provided, otherwise use original file name
    const displayName = metadata.customFileName
        ? `${metadata.customFileName}.pdf`
        : file.name;

    const params = new URLSearchParams({
        fileName: file.name,
        originalFileName: displayName, // This is what gets saved to DynamoDB
        ...(metadata.propertyAddress && { propertyAddress: metadata.propertyAddress }),
        ...(metadata.landlordName && { landlordName: metadata.landlordName }),
        ...(metadata.termsAccepted && { termsAccepted: 'true' }),
    });

    if (onProgress) onProgress(5); // Starting...

    let { uploadUrl, key, userId, contractId, deductionBypassed } = await apiCall(`/upload?${params.toString()}`);

    console.log(`Got presigned URL for key: ${key}, userId: ${userId}, deductionBypassed: ${deductionBypassed}`);

    if (deductionBypassed) {
        console.log("Deduction was bypassed by lambda, attempting direct local deduction...");
        try {
            await deductScan(userId);
            console.log("Local scan deduction successful!");
            // We handled it locally, so tell the caller it's no longer bypassed.
            deductionBypassed = false;
        } catch (e) {
            console.error("Local scan deduction failed (no scans remaining or db error). Aborting upload to prevent AI costs:", e);
            // We must cleanup the contract record since we are aborting!
            try {
                const cleanupParams = new URLSearchParams({ contractId, userId });
                await apiCall(`/contracts?${cleanupParams.toString()}`, { method: 'DELETE' });
            } catch (cleanupErr) {
                console.warn('Failed to cleanup after cancelled upload:', cleanupErr);
            }
            throw new Error(e.message || "Failed to deduct scan. No scans remaining or backend error.");
        }
    }

    const cleanupContractRecord = async () => {
        if (!contractId || !userId) return;
        try {
            const cleanupParams = new URLSearchParams({ contractId, userId });
            await apiCall(`/contracts?${cleanupParams.toString()}`, { method: 'DELETE' });
            console.warn('Cleaned up contract record after failed upload:', { contractId, userId });
        } catch (e) {
            console.warn('Failed to cleanup contract record after failed upload:', e);
        }
    };

    // Step 2: Upload directly to S3 with XMLHttpRequest for REAL progress
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let settled = false;

        const safeReject = (err) => {
            if (settled) return;
            settled = true;
            reject(err);
        };

        const safeResolve = (val) => {
            if (settled) return;
            settled = true;
            resolve(val);
        };

        // Track upload progress (real percentage!)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                // Scale from 5% to 95% during upload (leave room for start/finish)
                const percentComplete = Math.round((event.loaded / event.total) * 90) + 5;
                onProgress(Math.min(percentComplete, 95));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (onProgress) onProgress(100);
                console.log('File uploaded successfully to S3');
                safeResolve({
                    key,
                    userId,
                    contractId,
                    deductionBypassed,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString(),
                    metadata,
                });
            } else {
                cleanupContractRecord()
                    .finally(() => safeReject(new Error(`S3 Upload failed: ${xhr.status}`)));
            }
        };

        xhr.onerror = () => {
            cleanupContractRecord()
                .finally(() => safeReject(new Error('Network error during upload')));
        };

        xhr.onabort = () => {
            cleanupContractRecord()
                .finally(() => safeReject(new Error('Upload was aborted')));
        };

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/pdf');
        // Note: Metadata is passed via query params to the API and stored server-side
        // (e.g., DynamoDB). We don't rely on S3 x-amz-meta headers in the browser PUT.
        xhr.send(file);
    });
};
