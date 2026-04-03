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
    getLocalizedLabel,
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
    );
};

export default AdminUsersFilters;