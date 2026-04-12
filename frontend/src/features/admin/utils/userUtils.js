export const STATUS_FILTER_KEYS = ['status_enabled', 'status_disabled', 'status_pending'];

export const normalizeProviderKey = (user) => {
    const provider = String(user?.authProvider || '').trim().toLowerCase();
    if (provider.includes('google')) return 'google';
    return 'email';
};

export const normalizePackageKey = (user) => {
    const packageName = String(user?.packageName || '').trim().toLowerCase();
    if (!packageName) return 'none';
    if (user?.packageExpired) return 'expired';
    if (packageName.includes('free')) return 'free';
    if (packageName.includes('single')) return 'single';
    if (packageName.includes('basic')) return 'basic';
    if (packageName.includes('pro')) return 'pro';
    if (packageName.includes('admin')) return 'admin';
    return packageName;
};

export const getUserStatusKey = (user) => {
    const rawStatus = String(user?.status || '').toUpperCase();
    if (!user?.enabled) return 'disabled';
    if (rawStatus && rawStatus !== 'CONFIRMED' && rawStatus !== 'EXTERNAL_PROVIDER') return 'pending';
    return 'active';
};

export const applyUserFiltersAndSort = (users, { advancedFilters, searchQuery, sortConfig }) => {
    if (!Array.isArray(users)) return [];

    const query = searchQuery.toLowerCase().trim();
    const activeStatusFilter = advancedFilters.find(f => f.startsWith('status_'));
    const activeProviderFilters = advancedFilters.filter(f => f.startsWith('provider_')).map(f => f.replace('provider_', ''));
    const activePackageFilters = advancedFilters.filter(f => f.startsWith('package_')).map(f => f.replace('package_', ''));

    const filtered = users.filter(user => {
        // 1. Check Search
        if (query) {
            const searchStr = `${user.name || ''} ${user.email || ''}`.toLowerCase();
            if (!searchStr.includes(query)) return false;
        }

        // 2. Check Status
        if (activeStatusFilter) {
            const statusKey = getUserStatusKey(user);
            if (activeStatusFilter === 'status_enabled' && statusKey !== 'active') return false;
            if (activeStatusFilter === 'status_disabled' && statusKey !== 'disabled') return false;
            if (activeStatusFilter === 'status_pending' && statusKey !== 'pending') return false;
        }

        // 3. Check Provider
        if (activeProviderFilters.length > 0) {
            if (!activeProviderFilters.includes(normalizeProviderKey(user))) return false;
        }

        // 4. Check Package
        if (activePackageFilters.length > 0) {
            const packageKey = normalizePackageKey(user);
            if (!activePackageFilters.includes(packageKey) && !(activePackageFilters.includes('expired') && user.packageExpired)) {
                return false;
            }
        }

        return true;
    });

    // Sort safely
    filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
};


