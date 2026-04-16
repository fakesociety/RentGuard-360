/**
 * ============================================
 *  useUpload Hook
 *  Contract PDF Upload Logic and UI State
 * ============================================
 * 
 * STRUCTURE:
 * - Drag-and-drop constraints & progress loop
 * - Validates file, size, and scanning allowance
 * - Uploads and polls until processing complete
 * 
 * DEPENDENCIES:
 * - API (uploadFile, pollForAnalysis)
 * - SubscriptionContext
 * ============================================
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { pollForAnalysis } from '@/features/analysis/services/analysisApi';
import { uploadFile } from '@/features/upload/services/uploadApi';
import { emitAppToast } from '@/components/ui/toast/toast';
import { delay, isRetryableError, validateFile } from '../utils/uploadUtils';

export const useUpload = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { scansRemaining, isUnlimited, hasSubscription, refreshSubscription, deductScan } = useSubscription();

    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    // ------------------------------------------------------------------------
    // UPLOAD NETWORK STATE: Active process block
    // ------------------------------------------------------------------------
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedContractId, setUploadedContractId] = useState('');
    const fileInputRef = useRef(null);

    const [metadata, setMetadata] = useState({
        propertyAddress: '',
        landlordName: '',
        startDate: '',
        monthlyRent: '',
    });
    const [customFileName, setCustomFileName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [uploadVisualStatus, setUploadVisualStatus] = useState('idle');

    const uploadStartTimeRef = useRef(0);
    const actualUploadProgressRef = useRef(0);
    const progressIntervalRef = useRef(null);

    const MIN_PROGRESS_DURATION_MS = 4000;
    const COMPLETE_PERCENT_HOLD_MS = 800;

    const hasUploadEntitlement = isAdmin || hasSubscription;
    const hasScansAvailable = isAdmin || isUnlimited || scansRemaining > 0;
    const canChooseFile = hasUploadEntitlement && hasScansAvailable;
    const blockReason = !hasUploadEntitlement
        ? t('subscription.noActivePlanMessage')
        : t('subscription.noScansMessage');

    useEffect(() => {
        if (!uploadSuccess || !uploadedContractId) return;

        let cancelled = false;
        (async () => {
            try {
                // Poll every 2.5s for up to 120 attempts (5 minutes max).
                // Usually an analysis takes between 15 and 90 seconds. 
                const result = await pollForAnalysis(uploadedContractId, 120, 2500);
                if (cancelled) return;
                if (result) {
                    emitAppToast({
                        type: 'success',
                        title: t('notifications.analysisReadyTitle') || 'Analysis Ready',
                        message: t('notifications.analysisReadyMessage') || 'Your contract has been successfully analyzed.',
                    });
                    // Redirects seamlessly to the analysis results so users don't break flow with the back button
                    navigate(`/analysis/${encodeURIComponent(uploadedContractId)}`, { replace: true });
                } else {
                    // Polling timed out (took > 3 mins)
                    if (!cancelled) {
                        emitAppToast({
                            type: 'info',
                            title: t('notifications.analysisDelayedTitle') || 'Analysis working...',
                            message: t('notifications.analysisDelayedMessage') || 'The AI is taking longer than usual. Please check your contracts list in a moment.',
                        });
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    console.warn('Auto-navigate polling failed:', e);
                    emitAppToast({
                        type: 'info',
                        title: t('notifications.analysisDelayedTitle') || 'Analysis is running',
                        message: t('notifications.analysisDelayedMessage') || 'Please see the Contracts page a bit later to view your final report.',
                    });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [uploadSuccess, uploadedContractId, navigate, t]);

    const stopProgressLoop = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    const startProgressLoop = () => {
        stopProgressLoop();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - uploadStartTimeRef.current;
            let pacedProgress;

            if (elapsed <= 500) {
                pacedProgress = (elapsed / 500) * 50;
            } else if (elapsed <= 1200) {
                pacedProgress = 50 + ((elapsed - 500) / 700) * 40;
            } else {
                pacedProgress = 90 + ((elapsed - 1200) / 300) * 10;
            }

            pacedProgress = Math.min(100, pacedProgress);
            const actualProgress = Math.min(actualUploadProgressRef.current, 100);

            setUploadProgress((prev) => {
                const pacedStep = Math.max(prev, pacedProgress);
                const next = Math.min(pacedStep, actualProgress);
                return Number.isFinite(next) ? next : prev;
            });
        }, 50);
    };

    useEffect(() => {
        return () => {
            stopProgressLoop();
        };
    }, []);

    const handleFileSelect = (selectedFile) => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }

        setError('');
        setUploadSuccess(false);
        const validationError = validateFile(selectedFile, t);
        if (validationError) {
            setError(validationError);
            return;
        }
        setFile(selectedFile);
        setUploadVisualStatus('idle');
        setUploadProgress(0);
        const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
        setCustomFileName(nameWithoutExt);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        if (!canChooseFile) return;
        setIsDragging(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
        if (!canChooseFile) return;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    };

    const handleInputChange = (e) => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        const selectedFile = e.target.files[0];
        if (selectedFile) handleFileSelect(selectedFile);
    };

    const handleScannerComplete = (scannedPdfFile) => {
        handleFileSelect(scannedPdfFile);
        setShowScannerModal(false);
    };

    const handleUpload = async () => {
        if (!file) return;

        // Clean user input. E.g "my lease.pdf  " -> "my lease" to prevent double extensions in storage
        const normalizedCustomFileName = String(customFileName || '')
            .replace(/\.pdf$/i, '')
            .trim();

        const validationErrors = [];
        if (!termsAccepted) validationErrors.push(t('upload.termsRequired'));
        if (!normalizedCustomFileName) validationErrors.push(t('upload.fileNameRequired'));

        if (validationErrors.length > 0) {
            // Surface multiple validation errors as a single toast message to avoid UI spam
            const message = validationErrors.join(' ');
            setError(message);
            emitAppToast({
                type: 'error',
                title: t('upload.validationToastTitle'),
                message,
            });
            return;
        }

        // Before initiating network request and consuming bandwidth, client-side block on zero-balance subscriptions
        if (!isAdmin && !hasSubscription) {
            setError(t('subscription.noActivePlanMessage'));
            return;
        }

        if (!isAdmin && hasSubscription && !isUnlimited && scansRemaining <= 0) {
            setError(t('subscription.noScansMessage'));
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadVisualStatus('uploading');
        uploadStartTimeRef.current = Date.now();
        actualUploadProgressRef.current = 0;
        startProgressLoop();
        setError('');

        const MAX_RETRIES = 2;
        let lastErr = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`Upload retry attempt ${attempt}/${MAX_RETRIES}...`);
                    // Reset progress for retry
                    actualUploadProgressRef.current = 0;
                    setUploadProgress(0);
                    uploadStartTimeRef.current = Date.now();
                    await delay(2000); // Wait before retry
                }

                const result = await uploadFile(file, (progress) => {
                    actualUploadProgressRef.current = Math.max(actualUploadProgressRef.current, progress);
                }, {
                    propertyAddress: metadata.propertyAddress,
                    landlordName: metadata.landlordName,
                    customFileName: normalizedCustomFileName,
                    termsAccepted: true,
                });

                const elapsed = Date.now() - uploadStartTimeRef.current;
                const waitForMinimumDuration = Math.max(0, MIN_PROGRESS_DURATION_MS - elapsed);
                if (waitForMinimumDuration > 0) {
                    await delay(waitForMinimumDuration);
                }

                setUploadProgress(100);
                await delay(COMPLETE_PERCENT_HOLD_MS);
                setUploadVisualStatus('ready');
                await delay(250);

                // Sync the local scan credit count with the server.
                // If the AWS backend bypassed the deduction due to an RDS outage, manually deduct using the local backend.
                if (result.deductionBypassed) {
                    console.log('Backend bypassed deduction due to RDS outage. Deducting locally from LocalDB.');
                    try {
                        await deductScan();
                    } catch (deductErr) {
                        console.warn('Local deductScan also failed (RDS fully down). Refreshing subscription state.', deductErr);
                        await refreshSubscription(true);
                    }
                } else {
                    await refreshSubscription(true);
                }

                const finalContractId = result.contractId || result.key || '';
                setUploadedContractId(finalContractId);

                // Cache metadata so redirect immediately has details 
                if (finalContractId) {
                    try {
                        localStorage.setItem(`rentguard_contract_meta_${finalContractId}`, JSON.stringify({
                            fileName: normalizedCustomFileName,
                            propertyAddress: metadata.propertyAddress || '',
                            landlordName: metadata.landlordName || '',
                            uploadDate: new Date().toISOString(),
                            updatedAt: Date.now()
                        }));
                    } catch (e) {
                        console.warn('Failed to pre-cache metadata:', e);
                    }
                }

                setUploadSuccess(true);
                emitAppToast({
                    type: 'success',
                    title: t('upload.uploadSuccessTitle'),
                    message: t('upload.uploadSuccessMessage'),
                });
                setFile(null);
                setTermsAccepted(false);
                setCustomFileName('');
                setMetadata({
                    propertyAddress: '',
                    landlordName: '',
                    startDate: '',
                    monthlyRent: '',
                });
                setUploadVisualStatus('idle');
                setUploadProgress(0);
                stopProgressLoop();
                setIsUploading(false);
                return; // Success — exit the retry loop

            } catch (err) {
                lastErr = err;
                if (attempt < MAX_RETRIES && isRetryableError(err)) {
                    console.warn(`Upload attempt ${attempt + 1} failed with retryable error:`, err.message);
                    continue; // Retry
                }
                break; // Non-retryable or last attempt
            }
        }

        // All attempts failed
        console.error('Upload failed after all attempts:', lastErr);
        // Refresh subscription in case failure was due to zero scans hitting the backend directly
        await refreshSubscription(true);
        
        const friendlyMessage = isRetryableError(lastErr)
            ? t('upload.serverTemporaryError')
            : (lastErr?.message || t('upload.uploadFailed'));
        setError(friendlyMessage);
        setUploadVisualStatus('idle');
        emitAppToast({
            type: 'error',
            title: t('notifications.uploadFailedTitle'),
            message: friendlyMessage,
        });
        stopProgressLoop();
        setIsUploading(false);
    };

    const openFilePicker = () => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        fileInputRef.current?.click();
    };

    const removeSelectedFile = () => {
        if (isUploading) return;
        setFile(null);
        setCustomFileName('');
        setUploadVisualStatus('idle');
        setUploadProgress(0);
    };

    return {
        file,
        setFile,
        isDragging,
        isUploading,
        uploadProgress,
        error,
        uploadSuccess,
        setUploadSuccess,
        metadata,
        setMetadata,
        customFileName,
        setCustomFileName,
        termsAccepted,
        setTermsAccepted,
        showScannerModal,
        setShowScannerModal,
        uploadVisualStatus,
        fileInputRef,
        hasUploadEntitlement,
        hasScansAvailable,
        canChooseFile,
        blockReason,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleInputChange,
        handleScannerComplete,
        handleUpload,
        openFilePicker,
        removeSelectedFile,
        isAdmin,
        hasSubscription,
        isUnlimited,
        scansRemaining
    };
};
