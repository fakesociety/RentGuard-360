import React from 'react';
import { Mail } from 'lucide-react';

export const STATUS_FILTER_KEYS = ['status_enabled', 'status_disabled', 'status_pending'];

export const PACKAGE_TIERS = ['free', 'single', 'basic', 'pro', 'admin'];

export const normalizeProviderKey = (user) => {
    const provider = String(user?.authProvider || '').trim().toLowerCase();
    return provider.includes('google') ? 'google' : 'email';
};

export const normalizePackageKey = (user) => {
    const packageName = String(user?.packageName || '').trim().toLowerCase();
    if (!packageName) return 'none';
    if (user?.packageExpired) return 'expired';
    
    const matchedTier = PACKAGE_TIERS.find(tier => packageName.includes(tier));
    return matchedTier || packageName;
};

export const getUserStatusKey = (user) => {
    const rawStatus = String(user?.status || '').toUpperCase();
    if (!user?.enabled) return 'disabled';
    if (rawStatus && rawStatus !== 'CONFIRMED' && rawStatus !== 'EXTERNAL_PROVIDER') return 'pending';
    return 'active';
};

const extractFilters = (filters, prefix) => 
    filters.filter(f => f.startsWith(prefix)).map(f => f.replace(prefix, ''));

export const applyUserFiltersAndSort = (users, { advancedFilters, searchQuery, sortConfig }) => {
    if (!Array.isArray(users)) return [];

    const query = searchQuery.toLowerCase().trim();
    const activeStatusFilter = advancedFilters.find(f => f.startsWith('status_'));
    const activeProviderFilters = extractFilters(advancedFilters, 'provider_');
    const activePackageFilters = extractFilters(advancedFilters, 'package_');

    const filtered = users.filter(user => {
        if (query) {
            const searchStr = `${user.name || ''} ${user.email || ''}`.toLowerCase();
            if (!searchStr.includes(query)) return false;
        }

        if (activeStatusFilter) {
            const statusKey = getUserStatusKey(user);
            if (activeStatusFilter === 'status_enabled' && statusKey !== 'active') return false;
            if (activeStatusFilter === 'status_disabled' && statusKey !== 'disabled') return false;
            if (activeStatusFilter === 'status_pending' && statusKey !== 'pending') return false;
        }

        if (activeProviderFilters.length > 0) {
            if (!activeProviderFilters.includes(normalizeProviderKey(user))) return false;
        }

        if (activePackageFilters.length > 0) {
            const packageKey = normalizePackageKey(user);
            if (!activePackageFilters.includes(packageKey) && !(activePackageFilters.includes('expired') && user.packageExpired)) {
                return false;
            }
        }

        return true;
    });

    filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
};

// ============================================
// UI Presentation Utils
// ============================================

export const getUserStatusPresentation = (user, t) => {
    const statusKey = getUserStatusKey(user);
    if (statusKey === 'disabled') {
        return { badgeClass: 'disabled', label: t('admin.suspended') };
    }
    if (statusKey === 'pending') {
        return { badgeClass: 'pending', label: t('admin.pendingVerification') };
    }
    return { badgeClass: 'active', label: t('admin.active') };
};

export const getPackageDisplay = (user, t) => {
    const noneLabel = t('admin.none');
    const expiredLabel = t('admin.expired');
    const pendingLabel = t('admin.pending');
    
    if (!user?.packageName) return noneLabel;
    
    const packageKey = String(user.packageName).trim().toLowerCase();
    const matchedTier = PACKAGE_TIERS.find(tier => packageKey.includes(tier));
    const baseLabel = matchedTier
        ? t(`admin.package${matchedTier.charAt(0).toUpperCase() + matchedTier.slice(1)}`)
        : user.packageName;

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
    return { key: 'email', label: t('admin.emailPassword'), icon: <Mail size={14} /> };
};

export const getProviderDisplay = (user, t) => getProviderMeta(user, t).label;
