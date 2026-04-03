import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSystemStats } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { createTheme } from '@mui/material/styles';

export const useAdminAnalytics = () => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    // Create MUI theme for charts
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

    // Derived stats
    const riskDistribution = stats?.riskDistribution || {
        lowRisk: 0,
        lowMediumRisk: 0,
        mediumRisk: 0,
        highRisk: 0
    };

    const pieData = [
        { id: 0, value: riskDistribution.lowRisk, label: t('score.lowRisk') || 'Low Risk', color: '#22c55e' },
        { id: 1, value: riskDistribution.lowMediumRisk, label: t('score.lowMediumRisk') || 'Low-Medium', color: '#14b8a6' },
        { id: 2, value: riskDistribution.mediumRisk, label: t('score.mediumRisk') || 'Medium Risk', color: '#f59e0b' },
        { id: 3, value: riskDistribution.highRisk, label: t('score.highRisk') || 'High Risk', color: '#ef4444' },
    ];

    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];
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
