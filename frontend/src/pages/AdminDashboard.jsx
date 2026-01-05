import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getSystemStats } from '../services/api';
import Button from '../components/Button';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
    FileText,
    CheckCircle,
    Users,
    Clock,
    TrendingUp,
    UserPlus,
    AlertTriangle,
    Lock,
    RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';



const AdminDashboard = () => {
    const { isAdmin, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [userDateRange, setUserDateRange] = useState('30d');
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(450);

    useEffect(() => {
        fetchStats();
    }, []);

    // Responsive chart width
    useEffect(() => {
        const updateWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.offsetWidth;
                // Use container width minus padding (20px each side = 40px total)
                const availableWidth = containerWidth - 40;
                // Minimum 280, use full available width
                setChartWidth(Math.max(280, availableWidth));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        // Also update after a short delay to catch layout shifts
        const timer = setTimeout(updateWidth, 100);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
        };
    }, [loading]);

    const fetchStats = async () => {
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
    };

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

    const textColor = isDark ? '#f8fafc' : '#1a1a2e';
    const labelColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Access denied
    if (!isAdmin) {
        return (
            <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="access-denied">
                    <Lock size={48} />
                    <h1>{t('admin.accessDenied')}</h1>
                    <p>{t('admin.noPermission')}</p>
                </div>
            </div>
        );
    }

    // Date range calculation
    const getDateRange = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateRange) {
            case '7d':
                return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: today };
            case '30d':
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
            case 'month':
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
            case 'year':
                return { start: new Date(now.getFullYear(), 0, 1), end: today };
            default:
                if (dateRange && dateRange.match(/^\d{4}$/)) {
                    const year = parseInt(dateRange);
                    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
                }
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        }
    };

    const { start: rangeStart, end: rangeEnd } = getDateRange();

    // Filter contracts by day
    const contractsByDay = (stats?.contractsByDay || []).filter(d => {
        const date = new Date(d.date);
        return date >= rangeStart && date <= rangeEnd;
    });

    const lineChartDates = contractsByDay.map(d => {
        const date = new Date(d.date);
        if (dateRange === 'year' || dateRange.match(/^\d{4}$/)) {
            return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short' });
        }
        return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
    });
    const lineChartValues = contractsByDay.map(d => d.analyzed);

    // User registrations with date range filtering
    const getUserDateRange = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (userDateRange) {
            case '7d':
                return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: today };
            case '30d':
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
            case 'month':
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: today };
            case 'year':
                return { start: new Date(now.getFullYear(), 0, 1), end: today };
            default:
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        }
    };

    const { start: userRangeStart, end: userRangeEnd } = getUserDateRange();

    const filteredUserRegs = (stats?.userRegistrations || []).filter(d => {
        const date = new Date(d.date);
        return date >= userRangeStart && date <= userRangeEnd;
    });

    const userRegDates = filteredUserRegs.map(d => {
        const date = new Date(d.date);
        if (userDateRange === 'year') {
            return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short' });
        }
        return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
    });
    const userRegValues = filteredUserRegs.map(d => d.count);

    const formatTime = (seconds) => {
        if (!seconds) return '—';
        if (seconds < 60) return `${Math.round(seconds)} ${t('admin.seconds')}`;
        return `${Math.round(seconds / 60)} ${t('admin.minutes')}`;
    };

    const currentYear = new Date().getFullYear();

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>{t('admin.title')}</h1>
                <p>{isRTL ? 'שלום' : 'Hello'}, {userAttributes?.name || 'Admin'}</p>
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
                ) : stats && (
                    <ThemeProvider theme={chartTheme}>
                        <div className="stats-dashboard">
                            {/* Summary Cards */}
                            <div className="summary-cards">
                                <div className="summary-card contracts">
                                    <div className="card-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.contracts?.total || 0}</span>
                                        <span className="card-label">{t('admin.totalContracts')}</span>
                                    </div>
                                </div>
                                <div className="summary-card analyzed">
                                    <div className="card-icon">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.contracts?.analyzed || 0}</span>
                                        <span className="card-label">{t('admin.analyzed')}</span>
                                    </div>
                                </div>
                                <div className="summary-card users">
                                    <div className="card-icon">
                                        <Users size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{stats.users?.total || 0}</span>
                                        <span className="card-label">{t('admin.totalUsers')}</span>
                                    </div>
                                </div>
                                <div className="summary-card time">
                                    <div className="card-icon">
                                        <Clock size={24} />
                                    </div>
                                    <div className="card-info">
                                        <span className="card-value">{formatTime(stats.analysis?.avgAnalysisTimeSeconds)}</span>
                                        <span className="card-label">{t('admin.avgAnalysisTime')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Grid - Two Charts Side by Side */}
                            <div className="dashboard-charts-row" ref={chartContainerRef}>
                                {/* Contracts Over Time */}
                                <div className="dashboard-chart-card">
                                    <div className="chart-header">
                                        <h3>
                                            <TrendingUp size={16} />
                                            {t('admin.analyzedOverTime') || 'חוזים שנותחו לאורך הזמן'}
                                        </h3>
                                        <div className="date-range-selector">
                                            <div className="date-range-buttons">
                                                {['7d', '30d', 'month', 'year'].map(range => (
                                                    <button
                                                        key={range}
                                                        className={`range-btn ${dateRange === range ? 'active' : ''}`}
                                                        onClick={() => setDateRange(range)}
                                                    >
                                                        {range === '7d' ? `7 ${t('admin.days')}` :
                                                            range === '30d' ? `30 ${t('admin.days')}` :
                                                                range === 'month' ? t('admin.thisMonth') :
                                                                    t('admin.thisYear')}
                                                    </button>
                                                ))}
                                                <select
                                                    className="year-picker"
                                                    value={dateRange.match(/^\d{4}$/) ? dateRange : ''}
                                                    onChange={(e) => e.target.value && setDateRange(e.target.value)}
                                                >
                                                    <option value="" disabled>{t('admin.selectYear') || 'Year'}</option>
                                                    {Array.from({ length: 10 }, (_, i) => currentYear - i).map(year => (
                                                        <option key={year} value={String(year)}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-container line-chart-container" dir="ltr">
                                        {lineChartDates.length > 0 ? (
                                            <LineChart
                                                xAxis={[{
                                                    scaleType: 'point',
                                                    data: lineChartDates,
                                                    tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                                                }]}
                                                yAxis={[{
                                                    tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                                    width: 35,
                                                    position: 'left',
                                                }]}
                                                series={[{
                                                    data: lineChartValues,
                                                    area: true,
                                                    color: '#10B981',
                                                    showMark: false,
                                                }]}
                                                width={chartWidth}
                                                height={220}
                                                sx={{
                                                    '& .MuiAreaElement-root': { fillOpacity: 0.3 },
                                                    '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                                    '& .MuiChartsAxis-line': { stroke: labelColor },
                                                    '& .MuiChartsGrid-line': { stroke: gridColor },
                                                }}
                                                grid={{ horizontal: true }}
                                            />
                                        ) : (
                                            <div className="no-data">{t('admin.noData')}</div>
                                        )}
                                    </div>
                                </div>

                                {/* User Registrations Over Time */}
                                <div className="dashboard-chart-card">
                                    <div className="chart-header">
                                        <h3>
                                            <UserPlus size={16} />
                                            {t('admin.userRegistrations') || 'משתמשים שנרשמו לאורך הזמן'}
                                        </h3>
                                        <div className="date-range-selector">
                                            <div className="date-range-buttons">
                                                {['7d', '30d', 'month', 'year'].map(range => (
                                                    <button
                                                        key={range}
                                                        className={`range-btn ${userDateRange === range ? 'active' : ''}`}
                                                        onClick={() => setUserDateRange(range)}
                                                    >
                                                        {range === '7d' ? `7 ${t('admin.days')}` :
                                                            range === '30d' ? `30 ${t('admin.days')}` :
                                                                range === 'month' ? t('admin.thisMonth') :
                                                                    t('admin.thisYear')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-container bar-chart-container" dir="ltr">
                                        <BarChart
                                            xAxis={[{
                                                scaleType: 'band',
                                                data: userRegDates,
                                                tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                                            }]}
                                            yAxis={[{
                                                tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                            }]}
                                            series={[{
                                                data: userRegValues,
                                                color: '#3B82F6',
                                            }]}
                                            width={chartWidth}
                                            height={220}
                                            sx={{
                                                '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                                '& .MuiChartsAxis-line': { stroke: labelColor },
                                                '& .MuiChartsGrid-line': { stroke: gridColor },
                                            }}
                                            grid={{ horizontal: true }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <p className="stats-footer">
                                {t('admin.updatedAt')}: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleString(isRTL ? 'he-IL' : 'en-US') : '—'}
                            </p>
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
