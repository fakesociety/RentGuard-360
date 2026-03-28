/**
 * ============================================
 *  AdminUsers
 *  User Management for Administrators
 * ============================================
 * 
 * STRUCTURE:
 * - Search & filter controls
 * - Sortable users table
 * - Action buttons (disable, enable, delete)
 * - Confirmation modals
 * 
 * FEATURES:
 * - Search by email or name
 * - Filter by status (all/enabled/disabled)
 * - Column sorting (email, name, status, date)
 * - Enable/disable users with reason
 * - Delete users with double confirmation
 * 
 * DEPENDENCIES:
 * - api.js: getUsers, disableUser, enableUser, deleteUser
 * - ReactDOM.createPortal for modals
 * 
 * ============================================
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUsers, disableUser, enableUser, deleteUser } from '../services/api';
import { emitAppToast } from '../utils/toast';
import Button from '../components/Button';
import ActionMenu from '../components/ActionMenu';
import {
    Search,
    Ban,
    Check,
    Copy,
    Trash2,
    Users,
    AlertTriangle,
    RefreshCw,
    Mail,
    Filter,
    ChevronDown
} from 'lucide-react';
import './AdminDashboard.css';

const STATUS_FILTER_KEYS = ['status_enabled', 'status_disabled', 'status_pending'];

const AdminUsers = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [copiedUsername, setCopiedUsername] = useState(null);

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        type: null,
        username: null,
        title: '',
        message: '',
    });

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

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

        // 2. Sort
        filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle nulls safely
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            // Use localeCompare for strings (Case Insensitive & Language Aware)
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
                    : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
            }

            // Normal compare for numbers/booleans
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

    

    const getSortIcon = (columnKey) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <span className={`sort-icon ${isActive ? sortConfig.direction : 'inactive'}`}>
                {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}
            </span>
        );
    };

    // ... (rest of action handlers remain same)

    const handleDisableUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'disable',
            username,
            title: t('admin.confirmDisableTitle') || 'Disable User',
            message: `${t('admin.confirmDisable')}\n${getLocalizedLabel('admin.userLabel', 'User', 'משתמש')}: ${getUserIdentifier(username)}`,
        });
    };

    const handleEnableUser = async (username) => {
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

    const handleDeleteUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'delete',
            username,
            title: t('admin.confirmDeleteTitle') || 'Delete User',
            message: `${t('admin.confirmDelete')}\n${getLocalizedLabel('admin.userLabel', 'User', 'משתמש')}: ${getUserIdentifier(username)}`,
        });
    };

    const getLocalizedLabel = (key, fallbackEn, fallbackHe) => {
        const translated = t(key);
        if (translated && translated !== key) return translated;
        return isRTL ? fallbackHe : fallbackEn;
    };

    const getUserIdentifier = (username) => {
        const matchedUser = allUsers.find(user => user.username === username);
        if (!matchedUser) return username;

        const name = (matchedUser.name || '').trim();
        const email = (matchedUser.email || '').trim();
        if (name && email) return `${name} (${email})`;
        return name || email || username;
    };

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

    const handleModalConfirm = async () => {
        const { type, username } = modal;
        setModal({ ...modal, isOpen: false });

        if (type === 'disable') {
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
        } else if (type === 'delete') {
            setModal({
                isOpen: true,
                type: 'deleteConfirm',
                username,
                title: t('admin.confirmDeleteFinalTitle') || 'Final Confirmation',
                message: `${t('admin.confirmDeleteFinal')}\n${getLocalizedLabel('admin.userLabel', 'User', 'משתמש')}: ${getUserIdentifier(username)}`,
            });
        } else if (type === 'deleteConfirm') {
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
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const getUserStatusPresentation = (user) => {
        const statusKey = getUserStatusKey(user);

        if (statusKey === 'disabled') {
            return {
                badgeClass: 'disabled',
                label: t('admin.suspended') || 'Suspended',
            };
        }

        if (statusKey === 'pending') {
            return {
                badgeClass: 'pending',
                label: t('admin.pendingVerification') || (isRTL ? 'ממתין לאימות' : 'Pending verification'),
            };
        }

        return {
            badgeClass: 'active',
            label: t('admin.active') || 'Active',
        };
    };

    const getUserStatusKey = (user) => {
        const rawStatus = String(user?.status || '').toUpperCase();

        if (!user?.enabled) {
            return 'disabled';
        }

        if (rawStatus && rawStatus !== 'CONFIRMED' && rawStatus !== 'EXTERNAL_PROVIDER') {
            return 'pending';
        }

        return 'active';
    };

    const getPackageDisplay = (user) => {
        const noneLabel = getLocalizedLabel('admin.none', 'No package', 'ללא');
        const expiredLabel = getLocalizedLabel('admin.expired', 'expired', 'פג תוקף');
        const pendingLabel = getLocalizedLabel('admin.pending', 'pending', 'ממתין');

        if (!user?.packageName) {
            return noneLabel;
        }

        if (user?.packagePending) {
            return `${user.packageName} (${pendingLabel})`;
        }

        return user.packageExpired
            ? `${user.packageName} (${expiredLabel})`
            : user.packageName;
    };

    const getProviderDisplay = (user) => {
        return getProviderMeta(user).label;
    };

    const normalizeProviderKey = (user) => {
        const provider = String(user?.authProvider || '').trim().toLowerCase();
        if (provider.includes('google')) return 'google';
        if (provider.includes('facebook')) return 'facebook';
        return 'email';
    };

    const getProviderMeta = (user) => {
        const providerKey = normalizeProviderKey(user);

        if (providerKey === 'google') {
            return {
                key: 'google',
                label: 'Google',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                ),
            };
        }

        if (providerKey === 'facebook') {
            return {
                key: 'facebook',
                label: 'Facebook',
                icon: (
                    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708v-16.77h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.978 48 24z"/>
                    </svg>
                ),
            };
        }

        return {
            key: 'email',
            label: getLocalizedLabel('admin.emailPassword', 'Email', 'אימייל'),
            icon: <Mail size={14} />,
        };
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

    const isAdvancedFilterActive = (filterKey) => advancedFilters.includes(filterKey);

    const clearAdvancedFilters = () => setAdvancedFilters([]);

    const advancedFilterCount = advancedFilters.length;

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
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : (
                    <div className="users-tab">
                        {/* Search and Filters */}
                        <div className="users-controls">
                            <div className="search-container">
                                <Search className="search-icon" size={16} />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                            </div>

                            <div className="status-filter-buttons">
                                <ActionMenu
                                    isOpen={advancedFilterOpen}
                                    onToggle={() => setAdvancedFilterOpen(open => !open)}
                                    onClose={() => setAdvancedFilterOpen(false)}
                                    containerClassName="users-advanced-filter-menu"
                                    triggerClassName={`filter-btn users-advanced-trigger ${advancedFilterCount > 0 ? 'active' : ''}`}
                                    triggerAriaLabel={getLocalizedLabel('admin.advancedFilter', 'Advanced Filter', 'פילטר מתקדם')}
                                    triggerContent={
                                        <>
                                            <Filter size={14} />
                                            <span>{getLocalizedLabel('admin.advancedFilter', 'Advanced Filter', 'פילטר מתקדם')}</span>
                                            {advancedFilterCount > 0 && <span className="users-filter-pill">{advancedFilterCount}</span>}
                                            <ChevronDown size={14} />
                                        </>
                                    }
                                    panelClassName="users-filter-dropdown"
                                >
                                    <div className="users-filter-dropdown-header">
                                        <span>{getLocalizedLabel('admin.advancedFilter', 'Advanced Filter', 'פילטר מתקדם')}</span>
                                        <button type="button" className="users-filter-clear" onClick={clearAdvancedFilters}>
                                            {getLocalizedLabel('common.clear', 'Clear selections',  'נקה בחירות')}
                                        </button>
                                    </div>
                                    <div className="profile-divider users-filter-divider"></div>

                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_enabled') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_enabled')}>
                                        <span className="status-indicator active"></span>{getLocalizedLabel('admin.activeOnly', 'Active Only', 'פעילים בלבד')}
                                    </button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_disabled') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_disabled')}>
                                        <span className="status-indicator disabled"></span>{getLocalizedLabel('admin.disabledOnly', 'Disabled Only', 'מושעים בלבד')}
                                    </button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_pending') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_pending')}>
                                        <span className="status-indicator pending"></span>{getLocalizedLabel('admin.pendingVerification', 'Pending verification', 'ממתין לאימות')}
                                    </button>

                                    <div className="users-filter-subtitle">{getLocalizedLabel('admin.authProvider', 'Provider', 'ספק התחברות')}</div>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_email') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_email')}>
                                        <span className="provider-filter-icon email"><Mail size={14} /></span>
                                        {getLocalizedLabel('admin.emailPassword', 'Email', 'אימייל')}
                                    </button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_google') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_google')}>
                                        <span className="provider-filter-icon google">{getProviderMeta({ authProvider: 'Google' }).icon}</span>
                                        Google
                                    </button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_facebook') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_facebook')}>
                                        <span className="provider-filter-icon facebook">{getProviderMeta({ authProvider: 'Facebook' }).icon}</span>
                                        Facebook
                                    </button>

                                    <div className="users-filter-subtitle">{getLocalizedLabel('admin.package', 'Package', 'חבילה')}</div>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_free') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_free')}>Free</button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_basic') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_basic')}>Basic</button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_pro') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_pro')}>Pro</button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_none') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_none')}>
                                        {getLocalizedLabel('admin.packageNone', 'No package', 'ללא חבילה')}
                                    </button>
                                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_expired') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_expired')}>
                                        {getLocalizedLabel('admin.packageExpired', 'Expired package', 'חבילה שפג תוקפה')}
                                    </button>
                                </ActionMenu>
                            </div>
                        </div>

                        {/* Users Table */}
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
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="users-count">
                            {t('admin.showingUsers')?.replace('{count}', users.length) || `Showing ${users.length} users`}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal - rendered via Portal for full screen overlay */}
            {modal.isOpen && ['disable', 'delete', 'deleteConfirm'].includes(modal.type) && ReactDOM.createPortal(
                <div className={`admin-modal-overlay ${isDark ? 'dark' : 'light'}`} onClick={closeModal}>
                    <div className={`admin-modal ${isDark ? 'dark' : 'light'} ${(modal.type === 'delete' || modal.type === 'deleteConfirm') ? 'modal-error' : 'modal-warning'}`} onClick={e => e.stopPropagation()}>
                        <h3>{modal.title}</h3>
                        <p style={{ whiteSpace: 'pre-line' }}>{modal.message}</p>
                        <div className="modal-actions">
                            <>
                                <Button variant="secondary" onClick={closeModal}>
                                    {t('common.cancel') || 'Cancel'}
                                </Button>
                                <Button
                                    variant={(modal.type === 'delete' || modal.type === 'deleteConfirm') ? 'danger' : 'primary'}
                                    onClick={handleModalConfirm}
                                >
                                    {t('common.confirm') || 'Confirm'}
                                </Button>
                            </>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminUsers;
