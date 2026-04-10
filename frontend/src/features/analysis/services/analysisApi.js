import { apiCall, API_URL, getAuthToken, publicApiCall } from '@/services/apiClient';

export function normalizeAnalysis(data) {
    if (!data) return data;
    
    // Create a unified field for contract text
    data.normalizedContractText = 
        data.fullEditedText || 
        data.sanitizedText || 
        data.full_text || 
        data.contractText || 
        data.extracted_text || 
        '';
        
    return data;
}

export const getSharedAnalysis = async (shareToken) => {
    const cacheBuster = Date.now();
    const data = await publicApiCall(`/shared-analysis?shareToken=${encodeURIComponent(shareToken)}&_t=${cacheBuster}`, {}, { requireApiKey: false });
    return normalizeAnalysis(data);
};

/**
 * Create an expiring secure share link token for a contract.
 */

export const createShareLink = async (contractId, expiresInDays = 7) => {
    return apiCall('/contracts/sharing', {
        method: 'POST',
        body: JSON.stringify({ contractId, expiresInDays }),
    });
};

/**
 * Get active share link token for a contract if one exists and is not expired.
 */

export const getShareLink = async (contractId) => {
    return apiCall(`/contracts/sharing?contractId=${encodeURIComponent(contractId)}`, {
        method: 'GET',
    });
};

/**
 * Revoke an existing share link token for a contract.
 */

export const revokeShareLink = async (contractId) => {
    return apiCall('/contracts/sharing', {
        method: 'DELETE',
        body: JSON.stringify({ contractId }),
    });
};

/**
 * Get all contracts for a specific user
 * Returns empty array if no contracts or error
 */

export const getAnalysis = async (contractId, silent404 = false) => {
    const cacheBuster = Date.now();
    const data = await apiCall(`/analysis?contractId=${encodeURIComponent(contractId)}&_t=${cacheBuster}`, { silent404 });
    return normalizeAnalysis(data);
};

/**
 * Poll for analysis results with timeout
 */

export const pollForAnalysis = async (contractId, maxAttempts = 20, intervalMs = 5000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Polling for analysis (attempt ${attempt}/${maxAttempts})...`);

        try {
            // Use silent404=true to suppress expected 404 errors during polling
            const result = await getAnalysis(contractId, true);

            if (result && result.status === 'COMPLETED') {
                console.log('Analysis complete!');
                return result;
            }

            if (result && result.status === 'FAILED') {
                throw new Error('Analysis failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            if (error.status !== 404 && !error.message.includes('404') && !error.message.includes('processing')) {
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

export const saveEditedContract = async (contractId, userId, editedClauses, fullEditedText) => {
    console.log('DEBUG saveEditedContract called with:', { contractId, userId, editedClausesCount: Object.keys(editedClauses || {}).length });

    const data = await apiCall('/contracts/save-edited', {
        method: 'POST',
        body: JSON.stringify({
            contractId,
            userId,
            editedClauses,
            fullEditedText
        }),
    });

    console.log('DEBUG saveEditedContract response:', data);
    return data;
};

// ============================================
// ADMIN API FUNCTIONS
// ============================================

/**
 * Get system statistics (admin only)
 */
