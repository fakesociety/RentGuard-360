/**
 * ============================================
 *  AdminAnalytics
 *  Contract Intelligence Dashboard
 * ============================================
 * 
 * STRUCTURE:
 * - Aggregated statistics
 * - Visualizations (pie chart, common issues)
 * 
 * DEPENDENCIES:
 * - useAdminAnalytics hook
 * - components/AdminAnalyticsCards, AdminAnalyticsCharts
 * ============================================
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import Button from '@/components/ui/Button';
import { ThemeProvider } from '@mui/material/styles';
import { BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAdminAnalytics } from '@/features/admin/hooks/useAdminAnalytics';
import { AdminAnalyticsCards } from '@/features/admin/components/AdminAnalyticsCards';
import { AdminAnalyticsCharts } from '@/features/admin/components/AdminAnalyticsCharts';
import { getChartTheme, getRiskColor, CHART_COLORS, RISK_LEVEL_COLORS } from '@/features/admin/utils/chartUIUtils';
import { useTheme } from '@/contexts/ThemeContext';
import './AdminDashboardPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';
import { useMemo } from 'react';

const AdminAnalytics = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    
    const {
        loading,
        error,
        fetchStats,
        pieData: rawPieData,
        commonIssues: rawCommonIssues,
        avgRiskScore
    } = useAdminAnalytics();

    const chartTheme = useMemo(() => getChartTheme(isDark), [isDark]);
    const riskColor = useMemo(() => getRiskColor(avgRiskScore), [avgRiskScore]);

    const pieData = useMemo(() => 
        (rawPieData || []).map(item => ({ ...item, color: RISK_LEVEL_COLORS[item.state] || '#10b981' })), 
    [rawPieData]);

    const commonIssues = useMemo(() => 
        (rawCommonIssues || []).map((issue, index) => ({ ...issue, color: CHART_COLORS[index % CHART_COLORS.length] })), 
    [rawCommonIssues]);

    return (
        <>
            <header className="admin-header">
                <h1>
                    <BarChart3 size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.analytics') || 'Analytics'}
                </h1>
                <p>{t('admin.analyticsDescription') || 'Detailed contract analysis and risk insights'}</p>
            </header>

            <div className="admin-content">
                {error && (
                    <div className="error-banner">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                        <Button variant="secondary" size="small" onClick={fetchStats}>
                            <RefreshCw size={14} />
                            {t('admin.tryAgain')}
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <GlobalSpinner size={40} />
                    </div>
                ) : (
                    <ThemeProvider theme={chartTheme}>
                        <div className="stats-dashboard">
                            <AdminAnalyticsCards 
                                pieData={pieData}
                                avgRiskScore={avgRiskScore}
                                riskColor={riskColor}
                            />
                            <AdminAnalyticsCharts 
                                commonIssues={commonIssues}
                                loading={loading}
                            />
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </>
    );
};

export default AdminAnalytics;
// HMR trigger
