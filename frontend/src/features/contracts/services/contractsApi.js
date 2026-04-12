import { apiCall, API_URL } from '@/services/apiClient';

export const getContracts = async (userId) => {
    try {
        // Add timestamp to prevent caching
        const cacheBuster = Date.now();
        const data = await apiCall(`/contracts?userId=${encodeURIComponent(userId)}&_t=${cacheBuster}`);

        const normalizeStatus = (status) => {
            const s = String(status ?? '').trim().toLowerCase();
            if (!s) return '';
            if (s === 'analyzed' || s === 'completed' || s === 'complete') return 'analyzed';
            if (s === 'failed' || s === 'error') return 'failed';
            if (s.includes('fail') || s.includes('error')) return 'failed';
            if (s.includes('analy') || s.includes('complete')) return 'analyzed';
            if (s.includes('process') || s.includes('pend') || s.includes('upload')) return 'processing';
            return s;
        };

        const normalizeContract = (contract) => {
            if (!contract || typeof contract !== 'object') return contract;

            const uploadDate =
                contract.uploadDate ||
                contract.uploadedAt ||
                contract.uploaded_at ||
                contract.createdAt ||
                contract.created_at ||
                contract.timestamp;

            const analyzedDate =
                contract.analyzedDate ||
                contract.analyzedAt ||
                contract.analyzed_at ||
                contract.analysisDate;

            const contractId =
                contract.contractId ||
                contract.contract_id ||
                contract.id ||
                contract.key;

            const fileName =
                contract.fileName ||
                contract.originalFileName ||
                contract.original_file_name ||
                contract.filename;

            const status = normalizeStatus(
                contract.status ??
                contract.analysisStatus ??
                contract.analysis_status
            );

            const riskScore =
                contract.riskScore ??
                contract.risk_score ??
                contract.score ??
                contract.risk;

            return {
                ...contract,
                contractId,
                fileName,
                status,
                uploadDate,
                analyzedDate,
                riskScore,
            };
        };

        // Handle different response formats
        const items = Array.isArray(data) ? data : (data?.items || data?.contracts || []);
        return Array.isArray(items) ? items.map(normalizeContract) : [];
    } catch (error) {
        console.error('getContracts error:', error);
        // Return empty array on error so UI shows "No contracts"
        return [];
    }
};

/**
 * Get analysis results for a specific contract
 * @param {string} contractId - Contract ID
 * @param {boolean} silent404 - If true, suppress 404 errors in console (used during polling)
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

// ============================================
// CONTRACT OPERATIONS
// ============================================

/**
 * Ask AI to explain a specific clause
 * @param {string} contractId - The contract ID
 * @param {string} clauseText - The clause text to explain
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

// ============================================
// CONTACT
// ============================================

/**
 * Send a contact/support message (via CreateSupportTicket Lambda)
 * @param {object} formData - { name, email, subject, message }
 * @param {object} options - { isPublic?: boolean }
 */
