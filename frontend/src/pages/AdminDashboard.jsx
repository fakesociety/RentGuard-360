import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getSystemStats, getUsers, disableUser, enableUser, deleteUser } from '../services/api';
import Button from '../components/Button';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { isAdmin, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // Store all users for client-side filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'enabled', 'disabled'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    // Modal state for confirmations
    const [modal, setModal] = useState({
        isOpen: false,
        type: null, // 'disable' | 'delete' | 'deleteConfirm'
        username: null,
        title: '',
        message: '',
    });

    // Fetch data on mount
    useEffect(() => {
        if (activeTab === 'stats') {
            fetchStats();
        } else if (activeTab === 'users') {
            fetchAllUsers();
        }
    }, [activeTab]);

    // Live filter users when search or status filter changes
    useEffect(() => {
        if (activeTab === 'users' && allUsers.length > 0) {
            filterUsers();
        }
    }, [searchQuery, statusFilter, allUsers]);

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

    const fetchAllUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers('');
            setAllUsers(data.users || []);
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = [...allUsers];

        // Filter by status
        if (statusFilter === 'enabled') {
            filtered = filtered.filter(user => user.enabled);
        } else if (statusFilter === 'disabled') {
            filtered = filtered.filter(user => !user.enabled);
        }

        // Filter by search query (email or name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                (user.email?.toLowerCase().includes(query)) ||
                (user.name?.toLowerCase().includes(query))
            );
        }

        setUsers(filtered);
    };

    // Legacy function kept for compatibility
    const fetchUsers = async (search = '') => {
        fetchAllUsers();
    };

    const handleDisableUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'disable',
            username,
            title: t('admin.confirmDisableTitle') || 'Disable User',
            message: t('admin.confirmDisable'),
        });
    };

    const handleEnableUser = async (username) => {
        setActionLoading(username);
        try {
            await enableUser(username);
            fetchAllUsers();
        } catch (err) {
            setModal({
                isOpen: true,
                type: 'error',
                username: null,
                title: t('common.error') || 'Error',
                message: err.message,
            });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (username) => {
        setModal({
            isOpen: true,
            type: 'delete',
            username,
            title: t('admin.confirmDeleteTitle') || 'Delete User',
            message: t('admin.confirmDelete'),
        });
    };

    const handleModalConfirm = async () => {
        const { type, username } = modal;
        setModal({ ...modal, isOpen: false });

        if (type === 'disable') {
            setActionLoading(username);
            try {
                await disableUser(username, 'Admin action');
                fetchAllUsers();
            } catch (err) {
                setModal({
                    isOpen: true,
                    type: 'error',
                    username: null,
                    title: t('common.error') || 'Error',
                    message: err.message,
                });
            } finally {
                setActionLoading(null);
            }
        } else if (type === 'delete') {
            // Show second confirmation
            setModal({
                isOpen: true,
                type: 'deleteConfirm',
                username,
                title: t('admin.confirmDeleteFinalTitle') || '⚠️ Final Confirmation',
                message: t('admin.confirmDeleteFinal'),
            });
        } else if (type === 'deleteConfirm') {
            setActionLoading(username);
            try {
                await deleteUser(username);
                setModal({
                    isOpen: true,
                    type: 'success',
                    username: null,
                    title: t('common.success') || 'Success',
                    message: t('admin.userDeleted') || 'User deleted successfully',
                });
                fetchAllUsers();
            } catch (err) {
                console.error('Delete error:', err);
                setModal({
                    isOpen: true,
                    type: 'error',
                    username: null,
                    title: t('common.error') || 'Error',
                    message: err.message || 'Failed to delete user',
                });
            } finally {
                setActionLoading(null);
            }
        }
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    // Access denied
    if (!isAdmin) {
        return (
            <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="access-denied">
                    <h1>🔒 {t('admin.accessDenied')}</h1>
                    <p>{t('admin.noPermission')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>{t('admin.title')}</h1>
                <p>{isRTL ? 'שלום' : 'Hello'}, {userAttributes?.name || 'Admin'}</p>
            </header>

            {/* Tabs */}
            <div className="admin-tabs">
                <Button
                    variant={activeTab === 'stats' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('stats')}
                >
                    📈 {t('admin.statsTab')}
                </Button>
                <Button
                    variant={activeTab === 'users' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('users')}
                >
                    👥 {t('admin.usersTab')}
                </Button>
            </div>

            {/* Content */}
            <div className="admin-content">
                {error && (
                    <div className="error-banner">
                        ⚠️ {error}
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => activeTab === 'stats' ? fetchStats() : fetchUsers()}
                        >
                            {t('admin.tryAgain')}
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : activeTab === 'stats' ? (
                    <StatsTab stats={stats} t={t} isRTL={isRTL} isDark={isDark} />
                ) : (
                    <UsersTab
                        users={users}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onDisable={handleDisableUser}
                        onEnable={handleEnableUser}
                        onDelete={handleDeleteUser}
                        actionLoading={actionLoading}
                        t={t}
                        isRTL={isRTL}
                        isDark={isDark}
                    />
                )}
            </div>

            {/* Confirmation Modal */}
            {modal.isOpen && (
                <div className="admin-modal-overlay" onClick={closeModal}>
                    <div className={`admin-modal ${modal.type === 'error' ? 'modal-error' : modal.type === 'success' ? 'modal-success' : 'modal-warning'}`} onClick={e => e.stopPropagation()}>
                        <h3>{modal.title}</h3>
                        <p>{modal.message}</p>
                        <div className="modal-actions">
                            {modal.type === 'error' || modal.type === 'success' ? (
                                <Button variant="primary" onClick={closeModal}>
                                    {t('common.ok') || 'OK'}
                                </Button>
                            ) : (
                                <>
                                    <Button variant="secondary" onClick={closeModal}>
                                        {t('common.cancel') || 'Cancel'}
                                    </Button>
                                    <Button
                                        variant={modal.type === 'deleteConfirm' ? 'danger' : 'primary'}
                                        onClick={handleModalConfirm}
                                    >
                                        {modal.type === 'deleteConfirm'
                                            ? (t('admin.confirmDeleteBtn') || 'Yes, Delete Permanently')
                                            : (t('common.confirm') || 'Confirm')
                                        }
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Stats Tab Component with Charts
const StatsTab = ({ stats, t, isRTL, isDark }) => {
    const [dateRange, setDateRange] = useState('30d'); // '7d', '30d', 'month', 'year', '2025', '2024', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    if (!stats) return null;

    // Create MUI theme for charts based on dark/light mode
    const chartTheme = useMemo(() => createTheme({
        palette: {
            mode: isDark ? 'dark' : 'light',
            text: {
                primary: isDark ? '#ffffff' : '#1a1a2e',
                secondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            },
            background: {
                default: isDark ? '#0f0f23' : '#f8fafc',
                paper: isDark ? '#1a1a2e' : '#ffffff',
            },
        },
    }), [isDark]);

    const textColor = isDark ? '#ffffff' : '#1a1a2e';
    const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Calculate date range
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
            case 'custom':
                return {
                    start: customStartDate ? new Date(customStartDate) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    end: customEndDate ? new Date(customEndDate) : today
                };
            default:
                // Handle dynamic year selection e.g. '2025'
                if (dateRange && dateRange.match(/^\d{4}$/)) {
                    const year = parseInt(dateRange);
                    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
                }
                return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: today };
        }
    };

    const { start: rangeStart, end: rangeEnd } = getDateRange();

    // Contracts by day for line chart (from backend) - filtered by date range
    const contractsByDay = (stats.contractsByDay || []).filter(d => {
        const date = new Date(d.date);
        return date >= rangeStart && date <= rangeEnd;
    });

    const lineChartDates = contractsByDay.map(d => {
        const date = new Date(d.date);
        // Show different format based on range
        if (dateRange === 'year' || dateRange === '2025' || dateRange === '2024') {
            return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short' });
        }
        return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
    });
    const lineChartValues = contractsByDay.map(d => d.analyzed);

    // Users bar chart data - memoized to prevent re-render loops
    const usersData = useMemo(() => [
        { category: t('admin.totalUsers'), value: stats?.users?.total || 0, color: '#3b82f6' },
        { category: t('admin.activeUsers30'), value: stats?.users?.activeLast30Days || 0, color: '#22c55e' },
    ], [t, stats?.users?.total, stats?.users?.activeLast30Days]);

    // Risk score for gauge - 4 levels matching the legend
    const rawScore = stats?.analysis?.avgRiskScore || 0;
    const avgRiskScore = typeof rawScore === 'number' ? rawScore : parseInt(rawScore, 10);

    // 86-100: Green (Low Risk), 71-85: Teal (Low-Medium), 51-70: Orange (Medium), 0-50: Red (High)
    const riskColor = avgRiskScore >= 86 ? '#22c55e' :
        avgRiskScore >= 71 ? '#14b8a6' :
            avgRiskScore >= 51 ? '#f59e0b' : '#ef4444';

    const formatTime = (seconds) => {
        if (!seconds) return '—';
        if (seconds < 60) return `${Math.round(seconds)} ${t('admin.seconds')}`;
        return `${Math.round(seconds / 60)} ${t('admin.minutes')}`;
    };

    const currentYear = new Date().getFullYear();

    // Use a unique key to force remount charts when language/direction changes
    const chartKey = isRTL ? 'rtl' : 'ltr';

    return (
        <ThemeProvider theme={chartTheme} key={chartKey}>
            <div className="stats-dashboard">
                {/* Top Row - Summary Cards */}
                <div className="summary-cards">
                    <div className="summary-card contracts">
                        <div className="card-icon">📄</div>
                        <div className="card-info">
                            <span className="card-value">{stats.contracts?.total || 0}</span>
                            <span className="card-label">{t('admin.totalContracts')}</span>
                        </div>
                    </div>
                    <div className="summary-card analyzed">
                        <div className="card-icon">✅</div>
                        <div className="card-info">
                            <span className="card-value">{stats.contracts?.analyzed || 0}</span>
                            <span className="card-label">{t('admin.analyzed')}</span>
                        </div>
                    </div>
                    <div className="summary-card users">
                        <div className="card-icon">👥</div>
                        <div className="card-info">
                            <span className="card-value">{stats.users?.total || 0}</span>
                            <span className="card-label">{t('admin.totalUsers')}</span>
                        </div>
                    </div>
                    <div className="summary-card time">
                        <div className="card-icon">⏱️</div>
                        <div className="card-info">
                            <span className="card-value">{formatTime(stats.analysis?.avgAnalysisTimeSeconds)}</span>
                            <span className="card-label">{t('admin.avgAnalysisTime')}</span>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="charts-grid">
                    {/* Contracts Over Time Line Chart */}
                    <div className="chart-card chart-card-wide">
                        <div className="chart-header">
                            <h3>📈 {t('admin.analyzedOverTime')}</h3>
                            <div className="date-range-selector">
                                <div className="date-range-buttons">
                                    <button
                                        className={`range-btn ${dateRange === '7d' ? 'active' : ''}`}
                                        onClick={() => setDateRange('7d')}
                                    >
                                        7 {t('admin.days')}
                                    </button>
                                    <button
                                        className={`range-btn ${dateRange === '30d' ? 'active' : ''}`}
                                        onClick={() => setDateRange('30d')}
                                    >
                                        30 {t('admin.days')}
                                    </button>
                                    <button
                                        className={`range-btn ${dateRange === 'month' ? 'active' : ''}`}
                                        onClick={() => setDateRange('month')}
                                    >
                                        {t('admin.thisMonth')}
                                    </button>
                                    <button
                                        className={`range-btn ${dateRange === 'year' ? 'active' : ''}`}
                                        onClick={() => setDateRange('year')}
                                    >
                                        {t('admin.thisYear')}
                                    </button>

                                    {/* Year Picker Dropdown */}
                                    <select
                                        className="year-picker"
                                        value={dateRange.match(/^\d{4}$/) ? dateRange : ''}
                                        onChange={(e) => e.target.value && setDateRange(e.target.value)}
                                    >
                                        <option value="" disabled>{t('admin.selectYear') || 'שנה'}</option>
                                        {Array.from({ length: 10 }, (_, i) => currentYear - i).map(year => (
                                            <option key={year} value={String(year)}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="custom-date-range">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => {
                                            setCustomStartDate(e.target.value);
                                            setDateRange('custom');
                                        }}
                                        className="date-input"
                                    />
                                    <span className="date-separator">—</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => {
                                            setCustomEndDate(e.target.value);
                                            setDateRange('custom');
                                        }}
                                        className="date-input"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="chart-container line-chart-container">
                            {lineChartDates.length > 0 ? (
                                <LineChart
                                    xAxis={[{
                                        scaleType: 'point',
                                        data: lineChartDates,
                                        tickLabelStyle: {
                                            fill: textColor,
                                            fontSize: 10,
                                            angle: -45,
                                            textAnchor: 'end'
                                        },
                                    }]}
                                    yAxis={[{
                                        tickLabelStyle: { fill: textColor, fontSize: 11 },
                                        width: 35,
                                        position: 'left',
                                    }]}
                                    series={[
                                        {
                                            data: lineChartValues,
                                            area: true,
                                            color: '#22c55e',
                                            showMark: false,
                                        },
                                    ]}
                                    width={450}
                                    height={220}
                                    sx={{
                                        '& .MuiAreaElement-root': {
                                            fillOpacity: 0.3,
                                        },
                                        '& .MuiChartsAxis-tickLabel': {
                                            fill: textColor,
                                        },
                                        '& .MuiChartsAxis-line': {
                                            stroke: subTextColor,
                                        },
                                        '& .MuiChartsGrid-line': {
                                            stroke: gridColor,
                                        },
                                    }}
                                    grid={{ horizontal: true }}
                                />
                            ) : (
                                <div className="no-data">{t('admin.noData')}</div>
                            )}
                        </div>
                    </div>

                    {/* Risk Score Gauge */}
                    <div className="chart-card">
                        <h3>⚠️ {t('admin.avgRiskScore')}</h3>
                        <div className="chart-container gauge-container">
                            <Gauge
                                value={avgRiskScore}
                                valueMin={0}
                                valueMax={100}
                                width={200}
                                height={200}
                                sx={{
                                    [`& .${gaugeClasses.valueText}`]: {
                                        fontSize: 32,
                                        fontWeight: 'bold',
                                        fill: textColor,
                                    },
                                    [`& .${gaugeClasses.valueArc}`]: {
                                        fill: riskColor,
                                    },
                                    [`& .${gaugeClasses.referenceArc}`]: {
                                        fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    },
                                }}
                                text={({ value }) => `${Math.round(value)}/100`}
                            />
                            <p className="gauge-label" style={{ color: riskColor }}>
                                <span className="risk-dot" style={{ backgroundColor: riskColor }}></span>
                                {avgRiskScore >= 86 ? t('score.lowRisk') :
                                    avgRiskScore >= 71 ? t('score.lowMediumRisk') :
                                        avgRiskScore >= 51 ? t('score.mediumRisk') :
                                            t('score.highRisk')}
                            </p>
                        </div>
                        {/* Risk Score Legend */}
                        <div className="risk-legend">
                            <div className="legend-item excellent"><span className="dot"></span> 86-100: {t('score.lowRisk')}</div>
                            <div className="legend-item good"><span className="dot"></span> 71-85: {t('score.lowMediumRisk')}</div>
                            <div className="legend-item warning"><span className="dot"></span> 51-70: {t('score.mediumRisk')}</div>
                            <div className="legend-item danger"><span className="dot"></span> 0-50: {t('score.highRisk')}</div>
                        </div>
                    </div>

                    {/* Users Bar Chart */}
                    <div className="chart-card">
                        <h3>👥 {t('admin.usersSection')}</h3>
                        <div className="chart-container">
                            <BarChart
                                xAxis={[{
                                    scaleType: 'band',
                                    data: usersData.map(d => d.category),
                                    tickLabelStyle: { fill: textColor, fontSize: 11 },
                                }]}
                                yAxis={[{
                                    tickLabelStyle: { fill: textColor, fontSize: 11 },
                                    width: 30,
                                    position: 'left',
                                }]}
                                series={[
                                    {
                                        data: usersData.map(d => d.value),
                                        color: '#3b82f6',
                                    },
                                ]}
                                width={300}
                                height={200}
                                sx={{
                                    '& .MuiChartsAxis-tickLabel': {
                                        fill: textColor,
                                    },
                                    '& .MuiChartsAxis-line': {
                                        stroke: subTextColor,
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>

                <p className="stats-footer">
                    {t('admin.updatedAt')}: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleString(isRTL ? 'he-IL' : 'en-US') : '—'}
                </p>
            </div>
        </ThemeProvider>
    );
};

// Users Tab Component
const UsersTab = ({ users, searchQuery, setSearchQuery, statusFilter, setStatusFilter, onDisable, onEnable, onDelete, actionLoading, t, isRTL, isDark }) => (
    <div className="users-tab">
        {/* Search and Filters Row */}
        <div className="users-controls">
            {/* Live Search Input */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder={t('admin.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* Status Filter Buttons */}
            <div className="status-filter-buttons">
                <button
                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    {t('admin.allUsers')}
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'enabled' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('enabled')}
                >
                    🟢 {t('admin.activeOnly')}
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('disabled')}
                >
                    🔴 {t('admin.disabledOnly')}
                </button>
            </div>
        </div>

        {/* Users Table */}
        <div className="users-table-wrapper">
            <table className="users-table">
                <thead>
                    <tr>
                        <th>{t('admin.email')}</th>
                        <th>{t('admin.name')}</th>
                        <th>{t('admin.status')}</th>
                        <th>{t('admin.joined')}</th>
                        <th>{t('admin.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="no-data">{t('admin.noUsers')}</td>
                        </tr>
                    ) : (
                        users.map(user => (
                            <tr key={user.username} className={`user-row ${!user.enabled ? 'disabled-user' : ''}`}>
                                <td>{user.email || '—'}</td>
                                <td>{user.name || '—'}</td>
                                <td>
                                    <span className={`status-badge ${user.enabled ? 'active' : 'disabled'}`}>
                                        <span className="status-dot"></span>
                                        {user.enabled ? t('admin.active') : t('admin.suspended')}
                                    </span>
                                </td>
                                <td>
                                    {user.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')
                                        : '—'
                                    }
                                </td>
                                <td className="actions-cell">
                                    <div className="action-buttons">
                                        {user.enabled ? (
                                            <button
                                                className="action-icon-btn danger"
                                                onClick={() => onDisable(user.username)}
                                                disabled={actionLoading === user.username}
                                                title={t('admin.disable')}
                                            >
                                                {actionLoading === user.username ? '...' : '🚫'}
                                            </button>
                                        ) : (
                                            <button
                                                className="action-icon-btn success"
                                                onClick={() => onEnable(user.username)}
                                                disabled={actionLoading === user.username}
                                                title={t('admin.enable')}
                                            >
                                                {actionLoading === user.username ? '...' : '✓'}
                                            </button>
                                        )}
                                        <button
                                            className="action-icon-btn danger"
                                            onClick={() => onDelete(user.username)}
                                            disabled={actionLoading === user.username}
                                            title={t('admin.delete')}
                                        >
                                            {actionLoading === user.username ? '...' : '🗑'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <p className="users-count">
            {t('admin.showingUsers').replace('{count}', users.length)}
        </p>
    </div>
);

export default AdminDashboard;
