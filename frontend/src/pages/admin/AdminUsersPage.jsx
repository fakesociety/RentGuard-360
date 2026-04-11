/**
 * ============================================
 *  AdminUsers
 *  User Management for Administrators
 * ============================================
 */
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import Button from '@/components/ui/Button';
import { Users, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import './AdminDashboardPage.css';

import AdminUsersFilters from '@/features/admin/components/AdminUsersFilters';
import AdminUsersTable from '@/features/admin/components/AdminUsersTable';
import AdminUsersModals from '@/features/admin/components/AdminUsersModals';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';


const AdminUsers = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [visibleUsersCount, setVisibleUsersCount] = useState(0);
    const [modal, setModal] = useState({
        isOpen: false,
        type: null,
        username: null,
        title: '',
        message: '',
    });

    const {
        users,
        loading,
        error,
        actionLoading,
        searchQuery,
        setSearchQuery,
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
    } = useAdminUsers();

    const getSortIcon = (columnKey) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <span className={`sort-icon ${isActive ? sortConfig.direction : 'inactive'}`}>
                {isActive ? (sortConfig.direction === 'asc' ? '?' : '?') : '?'}
            </span>
        );
    };

    const handleDisableUser = (username) => {
        setModal({
            isOpen: true,
            type: 'disable',
            username,
            title: t('admin.confirmDisableTitle') || 'Disable User',
            message: `${t('admin.confirmDisable')}\n${t('admin.userLabel') || 'User'}: ${getUserIdentifier(username)}`,
        });
    };

    const handleEnableUser = (username) => {
        doEnableUser(username);
    };

    const handleDeleteUser = (username) => {
        setModal({
            isOpen: true,
            type: 'delete',
            username,
            title: t('admin.confirmDeleteTitle') || 'Delete User',
            message: `${t('admin.confirmDelete')}\n${t('admin.userLabel') || 'User'}: ${getUserIdentifier(username)}`,
        });
    };

    const handleModalConfirm = () => {
        const { type, username } = modal;
        setModal({ ...modal, isOpen: false });

        if (type === 'disable') {
            doDisableUser(username);
        } else if (type === 'delete') {
            setModal({
                isOpen: true,
                type: 'deleteConfirm',
                username,
                title: t('admin.confirmDeleteFinalTitle') || 'Final Confirmation',
                message: `${t('admin.confirmDeleteFinal')}\n${t('admin.userLabel') || 'User'}: ${getUserIdentifier(username)}`,
            });
        } else if (type === 'deleteConfirm') {
            doDeleteUser(username);
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const getUserStatusPresentation = (user) => {
        const statusKey = getUserStatusKey(user);
        if (statusKey === 'disabled') {
            return { badgeClass: 'disabled', label: t('admin.suspended') || 'Suspended' };
        }
        if (statusKey === 'pending') {
            return { badgeClass: 'pending', label: t('admin.pendingVerification') || 'Pending verification' };
        }
        return { badgeClass: 'active', label: t('admin.active') || 'Active' };
    };

    const getPackageDisplay = (user) => {
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

    const getProviderMeta = (user) => {
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

    const getProviderDisplay = (user) => getProviderMeta(user).label;

    const totalUsersCount = users.length;
    const fallbackVisibleCount = Math.min(
        typeof window !== 'undefined' && window.innerWidth <= 768 ? 5 : 30,
        totalUsersCount
    );
    const resolvedVisibleUsersCount = Math.min(
        visibleUsersCount > 0 || totalUsersCount === 0 ? visibleUsersCount : fallbackVisibleCount,
        totalUsersCount
    );
    const usersCountTemplate =
        t('admin.showingUsersDetailed') ||
        (isRTL
            ? 'מציג {visible} מתוך {total} משתמשים רשומים'
            : 'Showing {visible} of {total} registered users');
    const usersCountText = usersCountTemplate
        .replace('{visible}', resolvedVisibleUsersCount)
        .replace('{total}', totalUsersCount);

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>
                    <Users size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.usersTab') || 'User Management'}
                </h1>
            </header>

            <div className="admin-content">
                {error && (
                    <div className="error-banner">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                        <Button variant="secondary" size="small" onClick={fetchAllUsers}>
                            <RefreshCw size={14} />
                            {t('admin.tryAgain')}
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <GlobalSpinner size={40} />
                    </div>
                ) : (
                    <div className="users-tab">
                        <AdminUsersFilters
                            t={t}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            advancedFilterOpen={advancedFilterOpen}
                            setAdvancedFilterOpen={setAdvancedFilterOpen}
                            advancedFilterCount={advancedFilterCount}
                            clearAdvancedFilters={clearAdvancedFilters}
                            isAdvancedFilterActive={isAdvancedFilterActive}
                            toggleAdvancedFilter={toggleAdvancedFilter}
                            getProviderMeta={getProviderMeta}
                        />

                        <AdminUsersTable
                            t={t}
                            isRTL={isRTL}
                            users={users}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
                            getSortIcon={getSortIcon}
                            getUserStatusPresentation={getUserStatusPresentation}
                            copiedUsername={copiedUsername}
                            handleCopyEmail={handleCopyEmail}
                            getPackageDisplay={getPackageDisplay}
                            getProviderMeta={getProviderMeta}
                            getProviderDisplay={getProviderDisplay}
                            handleDisableUser={handleDisableUser}
                            handleEnableUser={handleEnableUser}
                            handleDeleteUser={handleDeleteUser}
                            actionLoading={actionLoading}
                            onVisibleUsersChange={setVisibleUsersCount}
                        />

                        <p className="users-count">
                            {usersCountText}
                        </p>
                    </div>
                )}
            </div>

            <AdminUsersModals
                modal={modal}
                closeModal={closeModal}
                handleModalConfirm={handleModalConfirm}
                isDark={isDark}
                t={t}
            />
        </div>
    );
};

export default AdminUsers;

