/**
 * ============================================
 *  useAdminAnalytics Hook
 *  Fetches and formats system statistical data
 * ============================================
 * 
 * STRUCTURE:
 * - fetchStats: Gets data from API
 * - chartTheme: MUI Theme config for charts
 * - pieData, commonIssues, avgRiskScore: Formatted data
 * 
 * DEPENDENCIES:
 * - getSystemStats API
 * ============================================
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSystemStats } from '@/features/admin/services/adminApi';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { createTheme } from '@mui/material/styles';

export const useAdminAnalytics = () => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    // ------------------------------------------------------------------------
    // STATE MANAGEMENT: Core statistics from the backend system
    // ------------------------------------------------------------------------
    const [stats, setStats] = useState(null);
    // Tracks API call progress across the entire dashboard view
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ------------------------------------------------------------------------
    // DATA FETCHING: Retrieves all aggregated metrics needed for Admin Dashboard
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // THEME & STYLING HYDRATION:
    // Generates a Material-UI Theme dynamically based on RentGuard's light/dark mode context
    // ------------------------------------------------------------------------
    const chartTheme = useMemo(() => createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            text: {
                primary: isDark ? '#f8fafc' : '#1a1a2e',
                secondary: isDark ? '#94a3b8' : 'rgba(0,0,0,0.6)',
            },
            background: {
                default: isDark ? '#0f0f23' : '#f8fafc',
                paper: isDark ? '#1a1a2e' : '#ffffff',
            },
        },
    }), [isDark]);

    // ------------------------------------------------------------------------
    // METRICS PROCESSING:
    // Secure defaults and transformations applied to pure API data before rendering
    // ------------------------------------------------------------------------
    const riskDistribution = stats?.riskDistribution || {
        lowRisk: 0,
        lowMediumRisk: 0,
        mediumRisk: 0,
        highRisk: 0
    };

    // Calculate risk distributions - match UI dashboard colors
    const pieData = [
        { id: 0, value: riskDistribution.lowRisk, label: t('score.lowRisk') || 'Low Risk', color: '#10b981' }, // success (green)
        { id: 1, value: riskDistribution.lowMediumRisk, label: t('score.lowMediumRisk') || 'Low-Medium', color: '#f59e0b' }, // warning (amber)
        { id: 2, value: riskDistribution.mediumRisk, label: t('score.mediumRisk') || 'Medium Risk', color: '#f97316' }, // orange
        { id: 3, value: riskDistribution.highRisk, label: t('score.highRisk') || 'High Risk', color: '#ef4444' }, // danger (red)
    ];

    // Professional, brand-aligned color palette (Teals, Emeralds, Blues) rather than rainbow
    const colors = [
        '#059669', // Emerald 600
        '#10B981', // Emerald 500
        '#34D399', // Emerald 400
        '#14B8A6', // Teal 500
        '#0D9488', // Teal 600
        '#0EA5E9', // Sky 500
        '#0284C7', // Sky 600
        '#3B82F6', // Blue 500
        '#64748B'  // Slate 500
    ];
    const rawCommonIssues = stats?.commonIssues || [];
    const commonIssues = rawCommonIssues.map((issue, index) => ({
        ...issue,
        color: colors[index % colors.length]
    }));

    const rawScore = stats?.analysis?.avgRiskScore || 60;
    const avgRiskScore = typeof rawScore === 'number' ? rawScore : parseInt(rawScore, 10);
    const riskColor = avgRiskScore >= 86 ? '#22c55e' :
        avgRiskScore >= 71 ? '#14b8a6' :
            avgRiskScore >= 51 ? '#f59e0b' : '#ef4444';

    return {
        stats,
        loading,
        error,
        fetchStats,
        chartTheme,
        pieData,
        commonIssues,
        avgRiskScore,
        riskColor,
        isDark
    };
};
