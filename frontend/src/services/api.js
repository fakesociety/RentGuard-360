/**
 * API Service - Handles all backend API calls with Cognito authentication
 * 
 * Endpoints:
 * - GET /upload?fileName=xxx - Get presigned URL for S3 upload
 * - GET /contracts?userId=xxx - Get user's contracts list
 * - GET /analysis?contractId=xxx - Get analysis results for a contract
 */

import { fetchAuthSession } from 'aws-amplify/auth';

// API Gateway base URL
const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

/**
 * Get the current user's auth token for API calls
 */
const getAuthToken = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) {
            throw new Error('No auth token available');
        }
        return token;
    } catch (error) {
        console.error('Failed to get auth token:', error);
        throw new Error('Authentication required');
    }
};

/**
 * Generic API call with Cognito authentication
 */
const apiCall = async (endpoint, options = {}) => {
    const token = await getAuthToken();

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`API Call: ${url}`);

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
};

/**
 * Upload a file to S3 using presigned URL
 * 
 * Flow:
 * 1. Get presigned URL from backend
 * 2. Upload file directly to S3
 * 3. Return the S3 key for tracking
 */
export const uploadFile = async (file, onProgress) => {
    // Step 1: Get presigned URL from our API
    const { uploadUrl, key, userId } = await apiCall(
        `/upload?fileName=${encodeURIComponent(file.name)}`
    );

    console.log(`Got presigned URL for key: ${key}, userId: ${userId}`);

    // Step 2: Upload directly to S3
    // Note: S3 presigned URLs don't support progress events natively
    // We'll simulate progress for better UX
    if (onProgress) onProgress(10);

    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': 'application/pdf',
        },
    });

    if (!uploadResponse.ok) {
        throw new Error(`S3 Upload failed: ${uploadResponse.status}`);
    }

    if (onProgress) onProgress(100);

    console.log('File uploaded successfully to S3');

    return {
        key,
        userId,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
    };
};

/**
 * Get all contracts for a specific user
 */
export const getContracts = async (userId) => {
    const data = await apiCall(`/contracts?userId=${encodeURIComponent(userId)}`);
    return data;
};

/**
 * Get analysis results for a specific contract
 */
export const getAnalysis = async (contractId) => {
    const data = await apiCall(`/analysis?contractId=${encodeURIComponent(contractId)}`);
    return data;
};

/**
 * Poll for analysis results with timeout
 * Analysis takes 30-60 seconds, so we poll until complete
 */
export const pollForAnalysis = async (contractId, maxAttempts = 20, intervalMs = 5000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Polling for analysis (attempt ${attempt}/${maxAttempts})...`);

        try {
            const result = await getAnalysis(contractId);

            if (result && result.status === 'COMPLETED') {
                console.log('Analysis complete!');
                return result;
            }

            if (result && result.status === 'FAILED') {
                throw new Error('Analysis failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            // 404 means still processing
            if (!error.message.includes('404')) {
                throw error;
            }
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    throw new Error('Analysis timed out - please check back later');
};

// Default export for convenience
export default {
    uploadFile,
    getContracts,
    getAnalysis,
    pollForAnalysis,
};
