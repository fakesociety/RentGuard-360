/**
 * ============================================
 *  AdminDashboard
 *  System Statistics & Analytics for Admins
 * ============================================
 * 
 * STRUCTURE:
 * - AdminDashboardCards: Summary widgets
 * - AdminDashboardCharts: Visual chart data
 * 
 * DEPENDENCIES:
 * - useAdminStats
 * - AuthContext (Checks isAdmin)
 * ============================================
 */
import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import { ThemeProvider } from '@mui/material/styles';
import { getChartTheme, getLabelColor, getGridColor } from '@/features/admin/utils/chartUIUtils';

import { AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useAdminStats } from '@/features/admin/hooks/useAdminStats';
import AdminDashboardCards from '@/features/admin/components/AdminDashboardCards';
import AdminDashboardCharts from '@/features/admin/components/AdminDashboardCharts';
import './AdminDashboardPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';


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

    const chartTheme = useMemo(() => getChartTheme(isDark), [isDark]);
    const labelColor = getLabelColor(isDark);
    const gridColor = getGridColor(isDark);
const accessDenied = !isAdmin;

    return (
        <>
            <header className="admin-header">
                <h1>{t('admin.title')}</h1>
                <p>{isRTL ? 'שלום' : 'Hello'}, <bdi>{userAttributes?.name || 'Admin'}</bdi></p>
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
                        <GlobalSpinner size={40} />
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
                </>
    );
};

export default AdminDashboard;

