import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSystemStats } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const useAdminStats = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [userDateRange, setUserDateRange] = useState('30d');

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSystemStats();
            setStats(data);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Unified Date Range Calculation
    const calculateDateRange = (range) => {
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
                if (range && range.match(/^\d{4}$/)) {
                    const year = parseInt(range);
                    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
                }
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        }
    };

    // Safe local date parser to avoid UTC offsets hiding today's data
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return new Date();
        const dateOnly = String(dateStr).slice(0, 10);
        const parts = dateOnly.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    const { start: rangeStart, end: rangeEnd } = calculateDateRange(dateRange);

    const contractsByDay = (stats?.contractsByDay || []).filter(d => {
        const date = parseLocalDate(d.date);
        return date >= rangeStart && date <= rangeEnd;
    });

    const contractsChartDataset = useMemo(() => {
        return contractsByDay.map(d => ({
            date: parseLocalDate(d.date),
            analyzed: d.analyzed,
        }));
    }, [contractsByDay]);

    const { start: userRangeStart, end: userRangeEnd } = calculateDateRange(userDateRange);

    const userChartDataset = useMemo(() => {
        const filteredUserRegs = (stats?.userRegistrations || []).filter(d => {
            const date = parseLocalDate(d.date);
            return date >= userRangeStart && date <= userRangeEnd;
        });

        return filteredUserRegs.map(d => ({
            date: parseLocalDate(d.date),
            count: Number(d.count) || 0
        }));
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
