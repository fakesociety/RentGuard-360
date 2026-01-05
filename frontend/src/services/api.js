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
 * Includes 30-second timeout and offline detection
 */
const apiCall = async (endpoint, options = {}) => {
    // Check if offline
    if (!navigator.onLine) {
        throw new Error('אין חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.');
    }

    const token = await getAuthToken();

    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`API Call: ${url}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        clearTimeout(timeoutId);

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
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('הבקשה נכשלה - הזמן הקצוב עבר. נסה שוב.');
        }
        throw error;
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
 * Update a contract's metadata (fileName, propertyAddress, landlordName)
 * @param {string} contractId - The contract ID
 * @param {string} userId - The user's ID
 * @param {object} updates - { fileName?, propertyAddress?, landlordName? }
 */
export const updateContract = async (contractId, userId, updates) => {
    const data = await apiCall('/contracts/rename', {
        method: 'POST',
        body: JSON.stringify({
            contractId,
            userId,
            ...updates
        }),
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

// ============ ADMIN API FUNCTIONS ============

/**
 * Get system statistics (admin only)
 */
export const getSystemStats = async () => {
    const data = await apiCall('/admin/stats', {
        method: 'GET',
    });
    return data;
};

/**
 * Get all users (admin only)
 * @param {string} searchQuery - Optional search filter
 */
export const getUsers = async (searchQuery = '') => {
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
    const data = await apiCall(`/admin/users${params}`, {
        method: 'GET',
    });
    return data;
};

/**
 * Disable a user (admin only)
 * @param {string} username - User's Cognito username/sub
 * @param {string} reason - Reason for disabling
 */
export const disableUser = async (username, reason = 'Policy violation') => {
    const data = await apiCall('/admin/users/disable', {
        method: 'POST',
        body: JSON.stringify({ username, reason }),
    });
    return data;
};

/**
 * Enable a user (admin only)
 * @param {string} username - User's Cognito username/sub
 */
export const enableUser = async (username) => {
    const data = await apiCall('/admin/users/enable', {
        method: 'POST',
        body: JSON.stringify({ username }),
    });
    return data;
};

// DAN DID IT - Added deleteAllUserContracts function to delete all contracts when user deletes their account
/**
 * Delete all contracts for the current user
 * Used when a user deletes their account
 * @param {string} userId - The user's ID
 */
export const deleteAllUserContracts = async (userId) => {
    try {
        // Get all user's contracts first
        const contracts = await getContracts(userId);
        
        // Delete each contract
        const deletePromises = contracts.map(contract => 
            deleteContract(contract.contractId, userId)
        );
        
        await Promise.all(deletePromises);
        return { success: true, count: contracts.length };
    } catch (error) {
        console.error('Error deleting user contracts:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a user permanently (admin only)
 * WARNING: This action cannot be undone!
 * @param {string} username - User's Cognito username/sub
 */
export const deleteUser = async (username) => {
    const data = await apiCall(`/admin/users/delete?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
    });
    return data;
};

export default {
    uploadFile,
    getContracts,
    getAnalysis,
    pollForAnalysis,
    deleteContract,
    deleteAllUserContracts, // DAN DID IT - Added for account deletion
    consultClause,
    sendContactMessage,
    saveEditedContract,
    getSystemStats,
    getUsers,
    disableUser,
    enableUser,
    deleteUser,
};
