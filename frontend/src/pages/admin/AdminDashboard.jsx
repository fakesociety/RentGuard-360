/**
 * ============================================
 *  AdminDashboard
 *  System Statistics & Analytics for Admins
 * ============================================
 */
import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/ui/Button';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useAdminStats } from '../../hooks/useAdminStats';
import AdminDashboardCards from './components/AdminDashboardCards';
import AdminDashboardCharts from './components/AdminDashboardCharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { isAdmin, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();

    const {
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
    } = useAdminStats();

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

    const labelColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    const accessDenied = !isAdmin;

    return (
        <div className={"admin-dashboard page-container " + (isDark ? 'dark' : 'light')} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>{t('admin.title')}</h1>
                <p>{isRTL ? 'שלום' : 'Hello'}, {userAttributes?.name || 'Admin'}</p>
            </header>

            <div className="admin-content">
                {accessDenied && (
                    <div className="access-denied">
                        <Lock size={48} />
                        <h1>{t('admin.accessDenied')}</h1>
                        <p>{t('admin.noPermission')}</p>
                    </div>
                )}

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

                {!accessDenied && loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : !accessDenied && stats && (
                    <ThemeProvider theme={chartTheme}>
                        <div className="stats-dashboard">
                            {/* Summary Cards */}
                            <AdminDashboardCards stats={stats} />

                            {/* Charts Grid - Two Charts Side by Side */}
                            <AdminDashboardCharts 
                                dateRange={dateRange}
                                setDateRange={setDateRange}
                                userDateRange={userDateRange}
                                setUserDateRange={setUserDateRange}
                                contractsChartDataset={contractsChartDataset}
                                userChartDataset={userChartDataset}
                                labelColor={labelColor}
                                gridColor={gridColor}
                            />

                            <p className="stats-footer">
                                {t('admin.updatedAt')}: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleString(isRTL ? 'he-IL' : 'en-US') : ''}
                            </p>
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
