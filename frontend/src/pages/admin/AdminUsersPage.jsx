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
import { Users, AlertTriangle, RefreshCw } from 'lucide-react';
import './AdminDashboardPage.css';

import AdminUsersFilters from '@/features/admin/components/AdminUsersFilters';
import AdminUsersTable from '@/features/admin/components/AdminUsersTable';
import AdminUsersModals from '@/features/admin/components/AdminUsersModals';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';
import { getUserStatusPresentation, getPackageDisplay, getProviderMeta, getProviderDisplay } from '@/features/admin/utils/userUtils';


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
        doDeleteUser
    } = useAdminUsers();

    const getSortIcon = (columnKey) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <span className={`sort-icon ${isActive ? sortConfig.direction : 'inactive'}`}>
                {isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
            </span>
        );
    };

    const handleDisableUser = (username) => {
        setModal({
            isOpen: true,
            type: 'disable',
            username,
            title: t('admin.confirmDisableTitle'),
            message: `${t('admin.confirmDisable')}\n${t('admin.userLabel')}: ${getUserIdentifier(username)}`,
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
            title: t('admin.confirmDeleteTitle'),
            message: `${t('admin.confirmDelete')}\n${t('admin.userLabel')}: ${getUserIdentifier(username)}`,
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
                title: t('admin.confirmDeleteFinalTitle'),
                message: `${t('admin.confirmDeleteFinal')}\n${t('admin.userLabel')}: ${getUserIdentifier(username)}`,
            });
        } else if (type === 'deleteConfirm') {
            doDeleteUser(username);
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const totalUsersCount = users.length;
    const fallbackVisibleCount = Math.min(
        typeof window !== 'undefined' && window.innerWidth <= 768 ? 5 : 30,
        totalUsersCount
    );
    const resolvedVisibleUsersCount = Math.min(
        visibleUsersCount > 0 || totalUsersCount === 0 ? visibleUsersCount : fallbackVisibleCount,
        totalUsersCount
    );

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>
                    <Users size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.usersTab')}
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
                            getProviderMeta={(user) => getProviderMeta(user, t)}
                        />

                        <AdminUsersTable
                            t={t}
                            isRTL={isRTL}
                            users={users}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
                            getSortIcon={getSortIcon}
                            getUserStatusPresentation={(user) => getUserStatusPresentation(user, t)}
                            copiedUsername={copiedUsername}
                            handleCopyEmail={handleCopyEmail}
                            getPackageDisplay={(user) => getPackageDisplay(user, t)}
                            getProviderMeta={(user) => getProviderMeta(user, t)}
                            getProviderDisplay={(user) => getProviderDisplay(user, t)}
                            handleDisableUser={handleDisableUser}
                            handleEnableUser={handleEnableUser}
                            handleDeleteUser={handleDeleteUser}
                            actionLoading={actionLoading}
                            onVisibleUsersChange={setVisibleUsersCount}
                        />

                        <p className="users-count">
                            {t('admin.showingUsersDetailed', { visible: resolvedVisibleUsersCount, total: totalUsersCount })}
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
