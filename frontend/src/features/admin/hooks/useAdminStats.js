/**
 * ============================================
 *  useAdminStats Hook
 *  Fetch and date-filter system statistics
 * ============================================
 * 
 * STRUCTURE:
 * - fetchStats: Gets data from API
 * - contractsChartDataset: For contract graphs
 * - userChartDataset: For user signup graphs
 * 
 * DEPENDENCIES:
 * - API (getSystemStats)
 * - statsUtils (Caching & Date logic)
 * ============================================
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getSystemStats } from '@/features/admin/services/adminApi';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { calculateDateRange, parseLocalDate, getCachedSystemStats, setCachedSystemStats } from '@/features/admin/utils/statsUtils';

export const useAdminStats = () => {
    const { t } = useLanguage();
    // ------------------------------------------------------------------------
    // STATE & TIME WINDOWS: Primary stats and active viewing ranges
    // ------------------------------------------------------------------------
    const [stats, setStats] = useState(() => getCachedSystemStats());
    const [loading, setLoading] = useState(() => !getCachedSystemStats());
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [userDateRange, setUserDateRange] = useState('30d');
    const initialHasCacheRef = useRef(Boolean(getCachedSystemStats()));

    // ------------------------------------------------------------------------
    // ASYNC LOAD PHASE: Server communication for metrics
    // ------------------------------------------------------------------------
    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = await getSystemStats();
            setStats(data);
            setCachedSystemStats(data);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchStats(initialHasCacheRef.current);
    }, [fetchStats]);

    const { start: rangeStart, end: rangeEnd } = calculateDateRange(dateRange);

    const contractsChartDataset = useMemo(() => {
        return (stats?.contractsByDay || []).reduce((acc, d) => {
            const date = parseLocalDate(d.date);
            if (date >= rangeStart && date <= rangeEnd) {
                acc.push({
                    date,
                    analyzed: d.analyzed
                });
            }
            return acc;
        }, []);
    }, [stats?.contractsByDay, rangeStart, rangeEnd]);

    const { start: userRangeStart, end: userRangeEnd } = calculateDateRange(userDateRange);

    const userChartDataset = useMemo(() => {
        return (stats?.userRegistrations || []).reduce((acc, d) => {
            const date = parseLocalDate(d.date);
            if (date >= userRangeStart && date <= userRangeEnd) {
                acc.push({
                    date,
                    count: Number(d.count) || 0
                });
            }
            return acc;
        }, []);
    }, [stats?.userRegistrations, userRangeStart, userRangeEnd]);

    return {
        stats,
        loading,
        error,
        fetchStats,
        dateRange,
        setDateRange,
        userDateRange,
        setUserDateRange,
        contractsChartDataset,
        userChartDataset
    };
};
