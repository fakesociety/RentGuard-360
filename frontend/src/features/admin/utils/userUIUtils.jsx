import React from 'react';
import { Mail } from 'lucide-react';
import { getUserStatusKey, normalizeProviderKey } from '@/features/admin/utils/userUtils';

export const getUserStatusPresentation = (user, t) => {
    const statusKey = getUserStatusKey(user);
    if (statusKey === 'disabled') {
        return { badgeClass: 'disabled', label: t('admin.suspended') || 'Suspended' };
    }
    if (statusKey === 'pending') {
        return { badgeClass: 'pending', label: t('admin.pendingVerification') || 'Pending verification' };
    }
    return { badgeClass: 'active', label: t('admin.active') || 'Active' };
};

export const getPackageDisplay = (user, t) => {
    const noneLabel = t('admin.none') || 'No package';
    const expiredLabel = t('admin.expired') || 'expired';
    const pendingLabel = t('admin.pending') || 'pending';
    
    if (!user?.packageName) return noneLabel;
    
    let packageKey = String(user.packageName).trim().toLowerCase();
    let baseLabel = user.packageName;
    
    if (packageKey.includes('free')) baseLabel = t('admin.packageFree') || 'Free';
    else if (packageKey.includes('single')) baseLabel = t('admin.packageSingle') || 'Single';
    else if (packageKey.includes('basic')) baseLabel = t('admin.packageBasic') || 'Basic';
    else if (packageKey.includes('pro')) baseLabel = t('admin.packagePro') || 'Pro';
    else if (packageKey.includes('admin')) baseLabel = t('admin.packageAdmin') || 'Admin';

    if (user?.packagePending) return `${baseLabel} (${pendingLabel})`;
    return user.packageExpired ? `${baseLabel} (${expiredLabel})` : baseLabel;
};

export const getProviderMeta = (user, t) => {
    const providerKey = normalizeProviderKey(user);
    if (providerKey === 'google') {
        return {
            key: 'google', label: 'Google', icon: (
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
            )
        };
    }
    return { key: 'email', label: t('admin.emailPassword') || 'Email', icon: <Mail size={14} /> };
};

export const getProviderDisplay = (user, t) => getProviderMeta(user, t).label;
