/**
 * ============================================
 *  AdminUsersFilters Component
 *  Filter and search bar for the users table
 * ============================================
 *
 * STRUCTURE:
 * - Search input
 * - Status/Provider/Package filters (dynamic)
 *
 * DEPENDENCIES:
 * - ActionMenu
 * ============================================
 */
import React from 'react';
import ActionMenu from '@/components/ui/ActionMenu';
import { Search, Filter, ChevronDown, Mail } from 'lucide-react';
import './AdminUsersFilters.css';

const STATUS_FILTERS = [
    { key: 'status_enabled', labelKey: 'admin.activeOnly', indicatorClass: 'active' },
    { key: 'status_disabled', labelKey: 'admin.disabledOnly', indicatorClass: 'disabled' },
    { key: 'status_pending', labelKey: 'admin.pendingVerification', indicatorClass: 'pending' },
];

const PACKAGE_FILTERS = [
    { key: 'package_free', labelKey: 'admin.packageFree' },
    { key: 'package_single', labelKey: 'admin.packageSingle' },
    { key: 'package_basic', labelKey: 'admin.packageBasic' },
    { key: 'package_pro', labelKey: 'admin.packagePro' },
    { key: 'package_admin', labelKey: 'admin.packageAdmin' },
    { key: 'package_none', labelKey: 'admin.packageNone' },
    { key: 'package_expired', labelKey: 'admin.packageExpired' },
];

const AdminUsersFilters = ({
    t,
    searchQuery,
    setSearchQuery,
    advancedFilterOpen,
    setAdvancedFilterOpen,
    advancedFilterCount,
    clearAdvancedFilters,
    isAdvancedFilterActive,
    toggleAdvancedFilter,
    getProviderMeta
}) => {
    return (
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
                    triggerAriaLabel={t('admin.advancedFilter')}
                    triggerContent={
                        <>
                            <Filter size={14} />
                            <span>{t('admin.advancedFilter')}</span>
                            {advancedFilterCount > 0 && <span className="users-filter-pill">{advancedFilterCount}</span>}
                            <ChevronDown size={14} />
                        </>
                    }
                    panelClassName="users-filter-dropdown"
                >
                    <div className="users-filter-dropdown-header">
                        <span>{t('admin.advancedFilter')}</span>
                        <button type="button" className="users-filter-clear" onClick={clearAdvancedFilters}>
                            {t('common.clearSelections')}
                        </button>
                    </div>
                    <div className="profile-divider users-filter-divider"></div>

                    {STATUS_FILTERS.map(({ key, labelKey, indicatorClass }) => (
                        <button
                            key={key}
                            type="button"
                            className={`profile-menu-item users-filter-item ${isAdvancedFilterActive(key) ? 'active' : ''}`}
                            onClick={() => toggleAdvancedFilter(key)}
                        >
                            <span className={`status-indicator ${indicatorClass}`}></span>
                            {t(labelKey)}
                        </button>
                    ))}

                    <div className="users-filter-subtitle">{t('admin.authProvider')}</div>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_email') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_email')}>
                        <span className="provider-filter-icon email"><Mail size={14} /></span>
                        {t('admin.emailPassword')}
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_google') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_google')}>
                        <span className="provider-filter-icon google">{getProviderMeta({ authProvider: 'Google' }).icon}</span>
                        Google
                    </button>

                    <div className="users-filter-subtitle">{t('admin.package')}</div>
                    {PACKAGE_FILTERS.map(({ key, labelKey }) => (
                        <button
                            key={key}
                            type="button"
                            className={`profile-menu-item users-filter-item ${isAdvancedFilterActive(key) ? 'active' : ''}`}
                            onClick={() => toggleAdvancedFilter(key)}
                        >
                            {t(labelKey)}
                        </button>
                    ))}
                </ActionMenu>
            </div>
        </div>
    );
};

export default AdminUsersFilters;
