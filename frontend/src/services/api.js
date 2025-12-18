/**
 * API Service - Handles all backend API calls with Cognito authentication
 * 
 * Endpoints:
 * - GET /upload?fileName=xxx - Get presigned URL for S3 upload
 * - GET /contracts?userId=xxx - Get user's contracts list
 * - GET /analysis?contractId=xxx - Get analysis results for a contract
 */

import { fetchAuthSession } from 'aws-amplify/auth';

// API Gateway base URL - fallback to production if env var not set
const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://qd8fvg2zm2.execute-api.us-east-1.amazonaws.com/prod';

// Validate API URL on load
if (!import.meta.env.VITE_API_ENDPOINT) {
    console.warn('⚠️ VITE_API_ENDPOINT not set, using fallback:', API_BASE_URL);
}

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

    // Check for HTML response (error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        console.error('Received HTML instead of JSON - API endpoint may be wrong');
        throw new Error('API configuration error');
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error: ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
        return { items: [] }; // Empty response for no data
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse JSON:', text.substring(0, 100));
        throw new Error('Invalid response from server');
    }
};

/**
 * Upload a file to S3 using presigned URL with REAL progress tracking
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @param {Object} metadata - Additional metadata (propertyAddress, landlordName)
 */
export const uploadFile = async (file, onProgress, metadata = {}) => {
    // Step 1: Get presigned URL from our API with original filename and metadata
    const params = new URLSearchParams({
        fileName: file.name,
        originalFileName: file.name,
        ...(metadata.propertyAddress && { propertyAddress: metadata.propertyAddress }),
        ...(metadata.landlordName && { landlordName: metadata.landlordName }),
    });

    if (onProgress) onProgress(5); // Starting...

    const { uploadUrl, key, userId } = await apiCall(`/upload?${params.toString()}`);

    console.log(`Got presigned URL for key: ${key}, userId: ${userId}`);

    // Step 2: Upload directly to S3 with XMLHttpRequest for REAL progress
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

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
                resolve({
                    key,
                    userId,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString(),
                    metadata,
                });
            } else {
                reject(new Error(`S3 Upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error during upload'));
        };

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/pdf');
        // Note: Metadata is passed via query params to get-upload-url, 
        // which stores it in S3 object metadata via presigned URL
        xhr.send(file);
    });
};

/**
 * Get all contracts for a specific user
 * Returns empty array if no contracts or error
 */
export const getContracts = async (userId) => {
    try {
        // Add timestamp to prevent caching
        const cacheBuster = Date.now();
        const data = await apiCall(`/contracts?userId=${encodeURIComponent(userId)}&_t=${cacheBuster}`);
        // Handle different response formats
        if (Array.isArray(data)) return data;
        if (data.items) return data.items;
        if (data.contracts) return data.contracts;
        return [];
    } catch (error) {
        console.error('getContracts error:', error);
        // Return empty array on error so UI shows "No contracts"
        return [];
    }
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
            if (!error.message.includes('404')) {
                throw error;
            }
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    throw new Error('Analysis timed out - please check back later');
};

/**
 * Delete a contract from S3 and DynamoDB
 * @param {string} contractId - The S3 key of the contract
 * @param {string} userId - The user's ID
 */
export const deleteContract = async (contractId, userId) => {
    const params = new URLSearchParams({
        contractId,
        userId,
    });

    const data = await apiCall(`/contracts?${params.toString()}`, {
        method: 'DELETE',
    });

    return data;
};

/**
 * Ask AI to explain a specific clause
 * @param {string} contractId - The contract ID
 * @param {string} clauseText - The clause text to explain
 */
export const consultClause = async (contractId, clauseText) => {
    const data = await apiCall('/consult', {
        method: 'POST',
        body: JSON.stringify({ contractId, clauseText }),
    });

    return data;
};

/**
 * Send a contact/support message (via CreateSupportTicket Lambda)
 * @param {object} formData - { name, email, subject, message }
 */
export const sendContactMessage = async (formData) => {
    // Map frontend field names to backend expected format
    const ticketData = {
        user_email: formData.email,
        category: formData.subject || 'General',
        message: formData.message,
        contract_id: formData.contractId || 'N/A'
    };

    // Use your existing API Gateway (has CORS configured)
    // Moty needs to add /contact route pointing to CreateSupportTicket Lambda
    // OR enable CORS on his Function URL in AWS Console
    const data = await apiCall('/contact', {
        method: 'POST',
        body: JSON.stringify(ticketData),
    });

    return data;
};

/**
 * Save edited contract to AWS
 * @param {string} contractId - Original contract ID
 * @param {string} userId - User ID
 * @param {object} editedClauses - Object with clauseId -> { text, action }
 * @param {string} fullEditedText - Full contract text with edits applied
 */
export const saveEditedContract = async (contractId, userId, editedClauses, fullEditedText) => {
    const data = await apiCall('/contracts/save-edited', {
        method: 'POST',
        body: JSON.stringify({
            contractId,
            userId,
            editedClauses,
            fullEditedText
        }),
    });

    return data;
};

export default {
    uploadFile,
    getContracts,
    getAnalysis,
    pollForAnalysis,
    deleteContract,
    consultClause,
    sendContactMessage,
    saveEditedContract,
};
