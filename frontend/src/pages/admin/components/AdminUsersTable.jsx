import React from 'react';
import { Copy, Check, Ban, Trash2 } from 'lucide-react';

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
    getLocalizedLabel
}) => {
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
                        <th>{getLocalizedLabel('admin.package', 'Package', 'חבילה')}</th>
                        <th>{getLocalizedLabel('admin.authProvider', 'Provider', 'ספק התחברות')}</th>
                        <th>{t('admin.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="no-data">{t('admin.noUsers')}</td>
                        </tr>
                    ) : (
                        users.map(user => {
                            const statusPresentation = getUserStatusPresentation(user);
                            const copyLabel = copiedUsername === user.username
                                ? getLocalizedLabel('admin.copied', 'Copied', 'הועתק')
                                : getLocalizedLabel('admin.copyEmail', 'Copy Email', 'העתק אימייל');
                            return (
                                <tr key={user.username} className={`user-row ${!user.enabled ? 'disabled-user' : ''}`}>
                                    <td className="email-cell" title={user.email || ''}>
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
                                    <td>{user.name || '—'}</td>
                                    <td>
                                        <span className={`status-badge ${statusPresentation.badgeClass}`}>
                                            <span className="status-dot"></span>
                                            {statusPresentation.label}
                                        </span>
                                    </td>
                                    <td>
                                        {user.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                                            : '—'
                                        }
                                    </td>
                                    <td>{getPackageDisplay(user)}</td>
                                    <td>
                                        <span className="provider-cell-content">
                                            <span className={`provider-icon-badge ${getProviderMeta(user).key}`}>
                                                {getProviderMeta(user).icon}
                                            </span>
                                            {getProviderDisplay(user)}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="action-buttons">
                                            {user.enabled ? (
                                                <button
                                                    className="action-icon-btn danger"
                                                    onClick={() => handleDisableUser(user.username)}
                                                    disabled={actionLoading === user.username}
                                                    title={t('admin.disable')}
                                                >
                                                    {actionLoading === user.username ? '...' : <Ban size={16} />}
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-icon-btn success"
                                                    onClick={() => handleEnableUser(user.username)}
                                                    disabled={actionLoading === user.username}
                                                    title={t('admin.enable')}
                                                >
                                                    {actionLoading === user.username ? '...' : <Check size={16} />}
                                                </button>
                                            )}
                                            <button
                                                className="action-icon-btn danger"
                                                onClick={() => handleDeleteUser(user.username)}
                                                disabled={actionLoading === user.username}
                                                title={t('admin.delete')}
                                            >
                                                {actionLoading === user.username ? '...' : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AdminUsersTable;