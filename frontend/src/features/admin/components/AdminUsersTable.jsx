/**
 * ============================================
 *  AdminUsersTable Component
 *  Data table for user management
 * ============================================
 *
 * STRUCTURE:
 * - Table headers with sorting
 * - User rows with actions
 * - Load more pagination
 *
 * DEPENDENCIES:
 * - None (presentational)
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Copy, Check, Ban, Trash2 } from 'lucide-react';
import './AdminUsersTable.css';

const MOBILE_PAGE_SIZE = 5;
const DESKTOP_PAGE_SIZE = 30;

const AdminUsersTable = ({
    t,
    isRTL,
    users,
    handleSort,
    getSortIcon,
    getUserStatusPresentation,
    copiedUsername,
    handleCopyEmail,
    getPackageDisplay,
    getProviderMeta,
    getProviderDisplay,
    handleDisableUser,
    handleEnableUser,
    handleDeleteUser,
    actionLoading,
    onVisibleUsersChange
}) => {
    const isMobile = useMediaQuery('(max-width:768px)');
    const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const [prevUsers, setPrevUsers] = useState(users);

    if (users !== prevUsers) {
        setPrevUsers(users);
        setVisibleCount(pageSize);
    }

    const disableLabel = t('admin.disable');
    const enableLabel = t('admin.enable');
    const deleteLabel = t('admin.delete');

    const displayedUsers = users.slice(0, visibleCount);
    const displayedUsersCount = displayedUsers.length;

    useEffect(() => {
        if (typeof onVisibleUsersChange === 'function') {
            onVisibleUsersChange(displayedUsersCount);
        }
    }, [displayedUsersCount, onVisibleUsersChange]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + pageSize);
    };

    return (
        <div className="users-table-wrapper">
            <table className="users-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('email')} className="sortable-header">
                            <div className="th-content">
                                {t('admin.email')}
                                {getSortIcon('email')}
                            </div>
                        </th>
                        <th onClick={() => handleSort('name')} className="sortable-header">
                            <div className="th-content">
                                {t('admin.name')}
                                {getSortIcon('name')}
                            </div>
                        </th>
                        <th onClick={() => handleSort('enabled')} className="sortable-header">
                            <div className="th-content">
                                {t('admin.status')}
                                {getSortIcon('enabled')}
                            </div>
                        </th>
                        <th onClick={() => handleSort('createdAt')} className="sortable-header">
                            <div className="th-content">
                                {t('admin.joined')}
                                {getSortIcon('createdAt')}
                            </div>
                        </th>
                        <th>{t('admin.package')}</th>
                        <th>{t('admin.authProvider')}</th>
                        <th>{t('admin.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="no-data">{t('admin.noUsers')}</td>
                        </tr>
                    ) : (
                        displayedUsers.map(user => {
                            const statusPresentation = getUserStatusPresentation(user, t);
                            const providerMeta = getProviderMeta(user, t);
                            const copyLabel = copiedUsername === user.username
                                ? t('admin.copied')
                                : t('admin.copyEmail');
                            const isLoading = actionLoading === user.username;
                            return (
                                <tr key={user.username} className={`user-row ${!user.enabled ? 'disabled-user' : ''}`}>
                                    <td className="email-cell" title={user.email || ''} data-label={t('admin.email')}>
                                        <div className="email-cell-content">
                                            <button
                                                className={`action-icon-btn copy email-copy-btn ${copiedUsername === user.username ? 'copied' : ''}`}
                                                onClick={() => handleCopyEmail(user.email, user.username)}
                                                disabled={!user.email}
                                                title={copyLabel}
                                                aria-label={copyLabel}
                                            >
                                                {copiedUsername === user.username ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                            <span className="email-text">{user.email || '—'}</span>
                                        </div>
                                    </td>
                                    <td data-label={t('admin.name')}><span className="td-value">{user.name || '—'}</span></td>
                                    <td data-label={t('admin.status')}>
                                        <span className={`td-value status-badge ${statusPresentation.badgeClass}`}>
                                            <span className="status-dot"></span>
                                            <span className="status-label">{statusPresentation.label}</span>
                                        </span>
                                    </td>
                                    <td data-label={t('admin.joined')}>
                                        <span className="td-value">
                                            {user.createdAt
                                                ? new Date(user.createdAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                                                : '—'
                                            }
                                        </span>
                                    </td>
                                    <td data-label={t('admin.package')}><span className="td-value">{getPackageDisplay(user, t)}</span></td>
                                    <td data-label={t('admin.authProvider')}>
                                        <span className="td-value provider-cell-content">
                                            <span className={`provider-icon-badge ${providerMeta.key}`}>
                                                {providerMeta.icon}
                                            </span>
                                            <span className="provider-label">{providerMeta.label}</span>
                                        </span>
                                    </td>
                                    <td className="actions-cell" data-label={t('admin.actions')}>
                                        <div className="action-buttons">
                                            {user.enabled ? (
                                                <button
                                                    className="action-icon-btn danger with-label"
                                                    onClick={() => handleDisableUser(user.username)}
                                                    disabled={isLoading}
                                                    title={disableLabel}
                                                    aria-label={disableLabel}
                                                >
                                                    {isLoading ? '...' : (
                                                        <>
                                                            <Ban size={16} />
                                                            <span className="action-btn-label">{disableLabel}</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-icon-btn success with-label"
                                                    onClick={() => handleEnableUser(user.username)}
                                                    disabled={isLoading}
                                                    title={enableLabel}
                                                    aria-label={enableLabel}
                                                >
                                                    {isLoading ? '...' : (
                                                        <>
                                                            <Check size={16} />
                                                            <span className="action-btn-label">{enableLabel}</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                className="action-icon-btn danger with-label"
                                                onClick={() => handleDeleteUser(user.username)}
                                                disabled={isLoading}
                                                title={deleteLabel}
                                                aria-label={deleteLabel}
                                            >
                                                {isLoading ? '...' : (
                                                    <>
                                                        <Trash2 size={16} />
                                                        <span className="action-btn-label">{deleteLabel}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
            {users.length > visibleCount && (
                <div className="load-more-container">
                    <button className="load-more-btn" onClick={handleLoadMore}>
                        {t('admin.loadMoreUsers')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminUsersTable;