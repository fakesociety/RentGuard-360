import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext/LanguageContext';
import { getUsers, disableUser, enableUser, deleteUser } from '../services/api';
import { emitAppToast } from '../utils/toast';
import { Mail } from 'lucide-react';

const STATUS_FILTER_KEYS = ['status_enabled', 'status_disabled', 'status_pending'];

const normalizeProviderKey = (user) => {
    const provider = String(user?.authProvider || '').trim().toLowerCase();
    if (provider.includes('google')) return 'google';
    if (provider.includes('facebook')) return 'facebook';
    return 'email';
};

const normalizePackageKey = (user) => {
    const packageName = String(user?.packageName || '').trim().toLowerCase();
    if (!packageName) return 'none';
    if (user?.packageExpired) return 'expired';
    if (packageName.includes('free')) return 'free';
    if (packageName.includes('basic')) return 'basic';
    if (packageName.includes('pro')) return 'pro';
    return packageName;
};

const getUserStatusKey = (user) => {
    const rawStatus = String(user?.status || '').toUpperCase();
    if (!user?.enabled) return 'disabled';
    if (rawStatus && rawStatus !== 'CONFIRMED' && rawStatus !== 'EXTERNAL_PROVIDER') return 'pending';
    return 'active';
};

export const useAdminUsers = () => {
    const { t, isRTL } = useLanguage();
    const [allUsers, setAllUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [copiedUsername, setCopiedUsername] = useState(null);

    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers('');
            setAllUsers(data.users || []);
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const filterAndSortUsers = useCallback(() => {
        let filtered = [...allUsers];
        const has = (key) => advancedFilters.includes(key);

        let selectedStatus = null;
        if (has('status_enabled')) selectedStatus = 'active';
        if (has('status_disabled')) selectedStatus = 'disabled';
        if (has('status_pending')) selectedStatus = 'pending';

        if (selectedStatus) {
            filtered = filtered.filter(user => getUserStatusKey(user) === selectedStatus);
        }

        const providerFilters = [];
        if (has('provider_email')) providerFilters.push('email');
        if (has('provider_google')) providerFilters.push('google');
        if (has('provider_facebook')) providerFilters.push('facebook');
        if (providerFilters.length > 0) {
            filtered = filtered.filter(user => providerFilters.includes(normalizeProviderKey(user)));
        }

        const packageFilters = [];
        if (has('package_free')) packageFilters.push('free');
        if (has('package_basic')) packageFilters.push('basic');
        if (has('package_pro')) packageFilters.push('pro');
        if (has('package_none')) packageFilters.push('none');
        if (has('package_expired')) packageFilters.push('expired');
        if (packageFilters.length > 0) {
            filtered = filtered.filter(user => {
                const packageKey = normalizePackageKey(user);
                if (packageFilters.includes(packageKey)) return true;
                if (packageFilters.includes('expired') && user.packageExpired) return true;
                return false;
            });
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                (user.email?.toLowerCase().includes(query)) ||
                (user.name?.toLowerCase().includes(query))
            );
        }

        filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
                    : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        setUsers(filtered);
    }, [advancedFilters, allUsers, searchQuery, sortConfig]);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    useEffect(() => {
        if (allUsers.length > 0) {
            filterAndSortUsers();
        }
    }, [allUsers.length, filterAndSortUsers]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleAdvancedFilter = (filterKey) => {
        setAdvancedFilters((current) => {
            if (STATUS_FILTER_KEYS.includes(filterKey)) {
                if (current.includes(filterKey)) {
                    return current.filter(key => key !== filterKey);
                }
                return [...current.filter(key => !STATUS_FILTER_KEYS.includes(key)), filterKey];
            }
            return current.includes(filterKey)
                ? current.filter(key => key !== filterKey)
                : [...current, filterKey];
        });
    };

    const clearAdvancedFilters = () => setAdvancedFilters([]);
    const isAdvancedFilterActive = (filterKey) => advancedFilters.includes(filterKey);
    const advancedFilterCount = advancedFilters.length;


    const getLocalizedLabel = useCallback((key, fallbackEn, fallbackHe) => {
        const translated = t(key);
        if (translated && translated !== key) return translated;
        return isRTL ? fallbackHe : fallbackEn;
    }, [t, isRTL]);

    const getUserIdentifier = useCallback((username) => {
        const matchedUser = allUsers.find(user => user.username === username);
        if (!matchedUser) return username;

        const name = (matchedUser.name || '').trim();
        const email = (matchedUser.email || '').trim();
        if (name && email) return `${name} (${email})`;
        return name || email || username;
    }, [allUsers]);

    const handleCopyEmail = async (email, username) => {
        if (!email) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(email);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = email;
                textArea.setAttribute('readonly', '');
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCopiedUsername(username);
            window.setTimeout(() => setCopiedUsername(current => current === username ? null : current), 1500);
            emitAppToast({
                type: 'success',
                title: getLocalizedLabel(
                    'admin.copySuccessTitle',
                    'Email copied',
                    'האימייל הועתק'
                ),
                message: getLocalizedLabel(
                    'admin.copySuccessMessage',
                    'Email address was copied to clipboard.',
                    'כתובת האימייל הועתקה ללוח.'
                ),
            });
        } catch (err) {
            emitAppToast({
                type: 'error',
                title: t('common.error') || 'Error',
                message: getLocalizedLabel(
                    'admin.copyFailed',
                    'Unable to copy email. Please select and copy manually.',
                    'לא ניתן להעתיק אימייל. אפשר לסמן ולהעתיק ידנית.'
                ),
            });
        }
    };


    const doEnableUser = async (username) => {
        setActionLoading(username);
        try {
            await enableUser(username);
            fetchAllUsers();
            emitAppToast({
                type: 'success',
                title: t('notifications.adminUserEnabledTitle'),
                message: t('notifications.adminUserEnabledMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } catch (err) {
            emitAppToast({
                type: 'error',
                title: t('notifications.adminUserEnableFailedTitle'),
                message: err.message || t('notifications.adminUserEnableFailedMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const doDisableUser = async (username) => {
        setActionLoading(username);
        try {
            await disableUser(username, 'Admin action');
            fetchAllUsers();
            emitAppToast({
                type: 'warning',
                title: t('notifications.adminUserDisabledTitle'),
                message: t('notifications.adminUserDisabledMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } catch (err) {
            emitAppToast({
                type: 'error',
                title: t('notifications.adminUserDisableFailedTitle'),
                message: err.message || t('notifications.adminUserDisableFailedMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } finally {
            setActionLoading(null);
        }
    };

    const doDeleteUser = async (username) => {
        setActionLoading(username);
        try {
            await deleteUser(username);
            fetchAllUsers();
            emitAppToast({
                type: 'warning',
                title: t('notifications.adminUserDeletedTitle'),
                message: t('notifications.adminUserDeletedMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } catch (err) {
            emitAppToast({
                type: 'error',
                title: t('notifications.adminUserDeleteFailedTitle'),
                message: err.message || t('notifications.adminUserDeleteFailedMessage')?.replace('{user}', getUserIdentifier(username)),
            });
        } finally {
            setActionLoading(null);
        }
    };

    return {
        users,
        allUsers,
        loading,
        error,
        actionLoading,
        searchQuery,
        setSearchQuery,
        advancedFilters,
        advancedFilterCount,
        toggleAdvancedFilter,
        isAdvancedFilterActive,
        clearAdvancedFilters,
        sortConfig,
        handleSort,
        copiedUsername,
        handleCopyEmail,
        fetchAllUsers,
        getLocalizedLabel,
        getUserIdentifier,
        doEnableUser,
        doDisableUser,
        doDeleteUser,
        getUserStatusKey,
        normalizeProviderKey
    };
};