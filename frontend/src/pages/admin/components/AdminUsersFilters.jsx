import React from 'react';
import ActionMenu from '../../../components/ui/ActionMenu';
import { Search, Filter, ChevronDown, Mail } from 'lucide-react';

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
                    triggerAriaLabel={t('admin.advancedFilter') || 'Advanced Filter'}
                    triggerContent={
                        <>
                            <Filter size={14} />
                            <span>{t('admin.advancedFilter') || 'Advanced Filter'}</span>
                            {advancedFilterCount > 0 && <span className="users-filter-pill">{advancedFilterCount}</span>}
                            <ChevronDown size={14} />
                        </>
                    }
                    panelClassName="users-filter-dropdown"
                >
                    <div className="users-filter-dropdown-header">
                        <span>{t('admin.advancedFilter') || 'Advanced Filter'}</span>
                        <button type="button" className="users-filter-clear" onClick={clearAdvancedFilters}>
                            {t('common.clearSelections') || 'Clear selections'}
                        </button>
                    </div>
                    <div className="profile-divider users-filter-divider"></div>

                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_enabled') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_enabled')}>
                        <span className="status-indicator active"></span>{t('admin.activeOnly') || 'Active Only'}
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_disabled') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_disabled')}>
                        <span className="status-indicator disabled"></span>{t('admin.disabledOnly') || 'Disabled Only'}
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('status_pending') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('status_pending')}>
                        <span className="status-indicator pending"></span>{t('admin.pendingVerification') || 'Pending verification'}
                    </button>

                    <div className="users-filter-subtitle">{t('admin.authProvider') || 'Provider'}</div>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_email') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_email')}>
                        <span className="provider-filter-icon email"><Mail size={14} /></span>
                        {t('admin.emailPassword') || 'Email'}
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_google') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_google')}>
                        <span className="provider-filter-icon google">{getProviderMeta({ authProvider: 'Google' }).icon}</span>
                        Google
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('provider_facebook') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('provider_facebook')}>
                        <span className="provider-filter-icon facebook">{getProviderMeta({ authProvider: 'Facebook' }).icon}</span>
                        Facebook
                    </button>

                    <div className="users-filter-subtitle">{t('admin.package') || 'Package'}</div>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_free') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_free')}>Free</button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_basic') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_basic')}>Basic</button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_pro') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_pro')}>Pro</button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_none') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_none')}>
                        {t('admin.packageNone') || 'No package'}
                    </button>
                    <button type="button" className={`profile-menu-item users-filter-item ${isAdvancedFilterActive('package_expired') ? 'active' : ''}`} onClick={() => toggleAdvancedFilter('package_expired')}>
                        {t('admin.packageExpired') || 'Expired package'}
                    </button>
                </ActionMenu>
            </div>
        </div>
    );
};

export default AdminUsersFilters;