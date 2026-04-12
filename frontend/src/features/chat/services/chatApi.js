import { apiCall, API_URL } from '@/services/apiClient';

export const askContractQuestion = async (contractId, question) => {
    const data = await apiCall('/contract-chat/ask', {
        method: 'POST',
        body: JSON.stringify({ contractId, question }),
    });
    return data;
};

/**
 * Get persisted contract chat history
 * @param {string} contractId - Contract ID
 * @param {number} limit - Max history rows
 */

export const getContractChatHistory = async (contractId, limit = 30) => {
    const data = await apiCall(
        `/contract-chat/history?contractId=${encodeURIComponent(contractId)}&limit=${encodeURIComponent(limit)}`,
        { method: 'GET' }
    );
    return Array.isArray(data?.items) ? data.items : [];
};

/**
 * Clear persisted contract chat history
 * @param {string} contractId - Contract ID
 */

export const clearContractChatHistory = async (contractId) => {
    const data = await apiCall(
        `/contract-chat/history?contractId=${encodeURIComponent(contractId)}`,
        {
            method: 'DELETE',
            body: JSON.stringify({ contractId }),
        }
    );
    return data;
};
