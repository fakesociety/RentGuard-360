/**
 * ============================================
 * Chart UI Utils
 * Pure functions for MUI themes and chart UI colors
 * ============================================
 */
import { createTheme } from '@mui/material/styles';

export const getChartTheme = (isDark) => createTheme({
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
});

export const CHART_COLORS = [
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

export const RISK_LEVEL_COLORS = {
    lowRisk: '#22c55e', // >= 86
    lowMediumRisk: '#14b8a6', // >= 71
    mediumRisk: '#f59e0b', // >= 51
    highRisk: '#ef4444'
};

export const getRiskColor = (rawScore) => {
    const avgRiskScore = typeof rawScore === 'number' ? rawScore : parseInt(rawScore, 10);
    if (isNaN(avgRiskScore)) return '#ef4444';
    if (avgRiskScore >= 86) return '#22c55e';
    if (avgRiskScore >= 71) return '#14b8a6';
    if (avgRiskScore >= 51) return '#f59e0b';
    return '#ef4444';
};

export const getRiskLevelLabel = (score, t) => {
    if (score >= 86) return t('score.lowRisk');
    if (score >= 71) return t('score.lowMediumRisk');
    if (score >= 51) return t('score.mediumRisk');
    return t('score.highRisk');
};

export const getLabelColor = (isDark) => isDark ? '#94a3b8' : '#475569';
export const getGridColor = (isDark) => isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
