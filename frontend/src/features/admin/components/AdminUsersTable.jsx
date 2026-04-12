/**
 * ============================================
 *  AdminUsersTable Component
 *  Data table for user management
 * ============================================
 * 
 * STRUCTURE:
 * - Table headers
 * - User rows with actions
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { Copy, Check, Ban, Trash2 } from 'lucide-react';
import './AdminUsersTable.css';

const AdminUsersTable = ({
    t,
    isRTL,
    users,
    sortConfig,
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
    const getInitialCount = () => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 5 : 30);
    const [visibleCount, setVisibleCount] = useState(getInitialCount());
    const disableLabel = t('admin.disable') || (isRTL ? 'חסום' : 'Disable');
    const enableLabel = t('admin.enable') || (isRTL ? 'הפעל' : 'Enable');
    const deleteLabel = t('admin.delete') || (isRTL ? 'מחק' : 'Delete');

    useEffect(() => {
        setVisibleCount(getInitialCount());
    }, [users]);

    const displayedUsers = users.slice(0, visibleCount);
    const displayedUsersCount = displayedUsers.length;

    useEffect(() => {
        if (typeof onVisibleUsersChange === 'function') {
            onVisibleUsersChange(displayedUsersCount);
        }
    }, [displayedUsersCount, onVisibleUsersChange]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + getInitialCount());
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
                        <th>{t('admin.package') || 'Package'}</th>
                        <th>{t('admin.authProvider') || 'Provider'}</th>
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
                            const statusPresentation = getUserStatusPresentation(user);
                            const copyLabel = copiedUsername === user.username
                                ? t('admin.copied')
                                : t('admin.copyEmail');
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
                                    <td data-label={t('admin.package') || 'Package'}><span className="td-value">{getPackageDisplay(user)}</span></td>
                                    <td data-label={t('admin.authProvider') || 'Provider'}>
                                        <span className="td-value provider-cell-content">
                                            <span className={`provider-icon-badge ${getProviderMeta(user).key}`}>
                                                {getProviderMeta(user).icon}
                                            </span>
                                            <span className="provider-label">{getProviderDisplay(user)}</span>
                                        </span>
                                    </td>
                                    <td className="actions-cell" data-label={t('admin.actions')}>
                                        <div className="action-buttons">
                                            {user.enabled ? (
                                                <button
                                                    className="action-icon-btn danger with-label"
                                                    onClick={() => handleDisableUser(user.username)}
                                                    disabled={actionLoading === user.username}
                                                    title={disableLabel}
                                                    aria-label={disableLabel}
                                                >
                                                    {actionLoading === user.username ? '...' : (
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
                                                    disabled={actionLoading === user.username}
                                                    title={enableLabel}
                                                    aria-label={enableLabel}
                                                >
                                                    {actionLoading === user.username ? '...' : (
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
                                                disabled={actionLoading === user.username}
                                                title={deleteLabel}
                                                aria-label={deleteLabel}
                                            >
                                                {actionLoading === user.username ? '...' : (
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
                        {t('admin.loadMoreUsers') || t('admin.loadMore') || (isRTL ? 'טען משתמשים נוספים..' : 'Load more users..')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminUsersTable;