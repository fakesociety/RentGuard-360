import { apiCall, API_URL } from '@/services/apiClient';
import { getContracts, deleteContract } from '@/features/contracts/services/contractsApi';

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

/**
 * Delete all contracts for a user (Admin action)
 * Using a sequential loop to prevent API Gateway rate-limiting (HTTP 429)
 * @param {string} userId - The user's ID
 */
export const deleteAllUserContracts = async (userId) => {
    try {
        const contracts = await getContracts(userId);

        if (!contracts || contracts.length === 0) {
            return { success: true, count: 0 };
        }

        let successCount = 0;
        let failedCount = 0;

        for (const contract of contracts) {
            try {
                await deleteContract(contract.contractId, userId);
                successCount++;
            } catch (err) {
                console.error(`Failed to delete contract ${contract.contractId}:`, err);
                failedCount++;
            }
        }

        return {
            success: failedCount === 0,
            count: successCount,
            failed: failedCount,
            total: contracts.length
        };
    } catch (error) {
        console.error('Error fetching user contracts for deletion:', error);
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
