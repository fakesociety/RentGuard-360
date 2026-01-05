import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getSystemStats } from '../services/api';
import Button from '../components/Button';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
    BarChart3,
    AlertTriangle,
    FileText,
    RefreshCw
} from 'lucide-react';
import './AdminDashboard.css';



const AdminAnalytics = () => {
    const { isAdmin } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(500);

    useEffect(() => {
        fetchStats();
    }, []);

    // Responsive chart width
    useEffect(() => {
        const updateWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.offsetWidth;
                setChartWidth(Math.max(300, containerWidth - 40));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
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

    // Risk distribution data
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

    // Common issues data
    const commonIssues = stats?.commonIssues || [];

    // Risk score
    const rawScore = stats?.analysis?.avgRiskScore || 60;
    const avgRiskScore = typeof rawScore === 'number' ? rawScore : parseInt(rawScore, 10);
    const riskColor = avgRiskScore >= 86 ? '#22c55e' :
        avgRiskScore >= 71 ? '#14b8a6' :
            avgRiskScore >= 51 ? '#f59e0b' : '#ef4444';

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
                            {/* Charts Grid - 2 equal cards */}
                            <div className="analytics-cards-row">
                                {/* Risk Distribution Pie Chart */}
                                <div className="analytics-card">
                                    <h3>
                                        <AlertTriangle size={16} />
                                        {t('admin.riskDistribution') || 'התפלגות סיכונים'}
                                    </h3>
                                    <div className="chart-content">
                                        <div className="pie-chart-wrapper">
                                            <PieChart
                                                series={[{
                                                    data: pieData,
                                                    innerRadius: 50,
                                                    outerRadius: 90,
                                                    paddingAngle: 2,
                                                    cornerRadius: 4,
                                                    highlightScope: { faded: 'global', highlighted: 'item' },
                                                }]}
                                                width={220}
                                                height={200}
                                                slotProps={{
                                                    legend: { hidden: true }
                                                }}
                                            />
                                        </div>
                                        <div className="pie-legend">
                                            {pieData.map((item) => (
                                                <div key={item.id} className="legend-item">
                                                    <span className="dot" style={{ backgroundColor: item.color }}></span>
                                                    <span className="legend-label">{item.label}</span>
                                                    <span className="legend-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Average Risk Score Gauge */}
                                <div className="analytics-card">
                                    <h3>
                                        <AlertTriangle size={16} />
                                        {t('admin.avgRiskScore') || 'ציון סיכון ממוצע'}
                                    </h3>
                                    <div className="chart-content gauge-content">
                                        <Gauge
                                            value={avgRiskScore}
                                            valueMin={0}
                                            valueMax={100}
                                            width={200}
                                            height={180}
                                            sx={{
                                                [`& .${gaugeClasses.valueText}`]: {
                                                    fontSize: 36,
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
                                </div>
                            </div>

                            {/* Common Problematic Clauses - Full Width */}
                            <div className="analytics-card analytics-card-full" ref={chartContainerRef}>
                                <h3>
                                    <FileText size={16} />
                                    {t('admin.commonIssues') || 'בעיות נפוצות בחוזים'}
                                </h3>
                                <div className="bar-chart-section">
                                    {/* Chart with short labels */}
                                    <div className="bar-chart-wrapper" dir="ltr">
                                        <BarChart
                                            layout="horizontal"
                                            yAxis={[{
                                                scaleType: 'band',
                                                data: commonIssues.map(i => i.code),
                                                tickLabelStyle: {
                                                    fill: labelColor,
                                                    fontSize: 12,
                                                    fontWeight: 600
                                                },
                                            }]}
                                            xAxis={[{
                                                tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                            }]}
                                            series={[{
                                                data: commonIssues.map(i => i.count),
                                                color: '#3B82F6',
                                            }]}
                                            width={Math.min(chartWidth, 600)}
                                            height={220}
                                            margin={{ left: 50, right: 20, top: 10, bottom: 30 }}
                                            sx={{
                                                '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                                '& .MuiChartsAxis-line': { stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
                                            }}
                                        />
                                    </div>
                                    {/* Legend Table for Hebrew text */}
                                    <div className="bar-chart-legend">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>{t('admin.code') || 'קוד'}</th>
                                                    <th>{t('admin.issue') || 'בעיה'}</th>
                                                    <th>{t('admin.count') || 'כמות'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {commonIssues.map((issue) => (
                                                    <tr key={issue.code}>
                                                        <td className="code-cell">{issue.code}</td>
                                                        <td className="issue-cell">{issue.topic}</td>
                                                        <td className="count-cell">{issue.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ThemeProvider>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;
