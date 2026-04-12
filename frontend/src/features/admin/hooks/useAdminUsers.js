/**
 * ============================================
 *  useAdminUsers Hook
 *  Manages User Administration Panel State
 * ============================================
 * 
 * STRUCTURE:
 * - Fetches users list
 * - Applies search, status, and package sorting/filtering (via userUtils)
 * - Functions for enable/disable/delete user statuses
 * 
 * DEPENDENCIES:
 * - API (getUsers, disableUser, enableUser, deleteUser)
 * - userUtils (Logic & Constants)
 * ============================================
 */
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { getUsers, disableUser, enableUser, deleteUser } from '@/features/admin/services/adminApi';
import { emitAppToast } from '@/utils/toast';
import { copyToClipboard } from '@/features/contracts/utils/browserUtils';
import { 
    STATUS_FILTER_KEYS, 
    normalizeProviderKey, 
    getUserStatusKey,
    applyUserFiltersAndSort
} from '@/features/admin/utils/userUtils';

const executeUserAction = async (actionFn, t, { titleKey, messageText, failTitleKey, failMessageText, type }, onSuccess, onFinally) => {
    try {
        await actionFn();
        onSuccess?.();
        emitAppToast({ type, title: t(titleKey), message: messageText });
    } catch (err) {
        emitAppToast({
            type: 'error',
            title: t(failTitleKey),
            message: err.message || failMessageText,
        });
    } finally {
        onFinally?.();
    }
};

export const useAdminUsers = () => {
    const { t } = useLanguage();
    const [allUsers, setAllUsers] = useState([]);
    // ------------------------------------------------------------------------
    // USER MANAGEMENT STATE: Data, API Loaders, Search/Filters
    // ------------------------------------------------------------------------
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
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const filterAndSortUsers = useCallback(() => {
        const filtered = applyUserFiltersAndSort(allUsers, { advancedFilters, searchQuery, sortConfig });
        setUsers(filtered);
    }, [advancedFilters, allUsers, searchQuery, sortConfig]);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

    useEffect(() => {
        filterAndSortUsers();
    }, [filterAndSortUsers]);

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
            const success = await copyToClipboard(email);
            if (!success) throw new Error('copy failure');

            setCopiedUsername(username);
            window.setTimeout(() => setCopiedUsername(current => current === username ? null : current), 1500);
            emitAppToast({
                type: 'success',
                title: t('admin.copySuccessTitle'),
                message: t('admin.copySuccessMessage'),
            });
        } catch {
            emitAppToast({
                type: 'error',
                title: t('common.error') || 'Error',
                message: t('admin.copyFailed'),
            });
        }
    };


    const handleAction = async (username, actionFn, titleKey, messageKey, failTitleKey, failMessageKey, type) => {
        setActionLoading(username);
        const userIdentifier = getUserIdentifier(username);
        await executeUserAction(
            actionFn,
            t,
            {
                titleKey,
                messageText: t(messageKey)?.replace('{user}', userIdentifier),
                failTitleKey,
                failMessageText: t(failMessageKey)?.replace('{user}', userIdentifier),
                type
            },
            fetchAllUsers,
            () => setActionLoading(null)
        );
    };

    const doEnableUser = (username) => 
        handleAction(
            username, 
            () => enableUser(username), 
            'notifications.adminUserEnabledTitle', 
            'notifications.adminUserEnabledMessage', 
            'notifications.adminUserEnableFailedTitle', 
            'notifications.adminUserEnableFailedMessage', 
            'success'
        );

    const doDisableUser = (username) => 
        handleAction(
            username, 
            () => disableUser(username, 'Admin action'), 
            'notifications.adminUserDisabledTitle', 
            'notifications.adminUserDisabledMessage', 
            'notifications.adminUserDisableFailedTitle', 
            'notifications.adminUserDisableFailedMessage', 
            'warning'
        );

    const doDeleteUser = (username) => 
        handleAction(
            username, 
            () => deleteUser(username), 
            'notifications.adminUserDeletedTitle', 
            'notifications.adminUserDeletedMessage', 
            'notifications.adminUserDeleteFailedTitle', 
            'notifications.adminUserDeleteFailedMessage', 
            'warning'
        );

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
        getUserIdentifier,
        doEnableUser,
        doDisableUser,
        doDeleteUser,
        getUserStatusKey,
        normalizeProviderKey
    };
};