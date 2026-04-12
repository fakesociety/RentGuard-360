import { publicApiCall } from '@/services/apiClient';

export const checkUserStatus = async (email) => {
    try {
        const data = await publicApiCall(`/auth/check-user?email=${encodeURIComponent(email)}`);
        return data;
    } catch (error) {
        console.error('checkUserStatus error:', error);
        // Fallback to allowing registration try if check fails
        return { status: 'USER_NOT_FOUND' };
    }
};
