import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../../components/ui/Button';
import { ThemeProvider } from '@mui/material/styles';
import { BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';
import { AdminAnalyticsCards } from './components/AdminAnalyticsCards';
import { AdminAnalyticsCharts } from './components/AdminAnalyticsCharts';
import './AdminDashboard.css';

const AdminAnalytics = () => {
    const { t, isRTL } = useLanguage();
    
    const {
        loading,
        error,
        fetchStats,
        chartTheme,
        pieData,
        commonIssues,
        avgRiskScore,
        riskColor,
        isDark
    } = useAdminAnalytics();

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
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
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
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
        </div>
    );
};

export default AdminAnalytics;
