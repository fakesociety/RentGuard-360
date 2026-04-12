/**
 * ============================================
 * Stats Utils
 * Pure functions for calculating stats dates and caching
 * ============================================
 */

const CACHE_KEY = 'rg_admin_system_stats';

export const getCachedSystemStats = () => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const setCachedSystemStats = (data) => {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // ignore cache write errors
    }
};

export const calculateDateRange = (range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
        case '7d':
            return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: today };
        case '30d':
            return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        case 'month':
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
        case 'year':
            return { start: new Date(now.getFullYear(), 0, 1), end: today };
        case 'all':
            return { start: new Date(2020, 0, 1), end: today };
        default:
            if (range && String(range).match(/^\d{4}$/)) {
                const year = parseInt(range, 10);
                return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
            }
            return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
    }
};

export const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const dateOnly = String(dateStr).slice(0, 10);
    const parts = dateOnly.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
};
