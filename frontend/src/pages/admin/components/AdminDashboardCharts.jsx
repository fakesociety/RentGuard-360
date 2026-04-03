import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { LineChart } from '@mui/x-charts/LineChart';
import { TrendingUp, UserPlus } from 'lucide-react';

const AdminDashboardCharts = ({ 
    dateRange, 
    setDateRange, 
    userDateRange, 
    setUserDateRange, 
    contractsChartDataset, 
    userChartDataset,
    labelColor,
    gridColor
}) => {
    const { t, isRTL } = useLanguage();
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(450);

    // Responsive chart width
    useEffect(() => {
        const updateWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.offsetWidth;
                const availableWidth = containerWidth - 40;
                setChartWidth(Math.max(280, availableWidth));
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        const timer = setTimeout(updateWidth, 100);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="dashboard-charts-row">
            {/* Contracts Over Time */}
            <div className="dashboard-chart-card" ref={chartContainerRef}>
                <div className="chart-header">
                    <h3>
                        <TrendingUp size={16} />
                        {t('admin.analyzedOverTime') || 'חוזים שנותחו לאורך הזמן'}
                    </h3>
                    <div className="date-range-selector">
                        <div className="date-range-buttons">
                            {['7d', '30d', 'month', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${dateRange === range ? 'active' : ''}`}
                                    onClick={() => setDateRange(range)}
                                >
                                    {range === '7d' ? `7 ${t('admin.days')}` :
                                        range === '30d' ? `30 ${t('admin.days')}` :
                                            range === 'month' ? t('admin.thisMonth') :
                                                range === 'year' ? t('admin.thisYear') :
                                                    t('admin.allTime') || 'הכל'}
                                </button>
                            ))}
                            <select
                                className="year-picker"
                                value={dateRange.match(/^\d{4}$/) ? dateRange : ''}
                                onChange={(e) => e.target.value && setDateRange(e.target.value)}
                            >
                                <option value="" disabled>{t('admin.selectYear') || 'Year'}</option>
                                {[2026, 2025].map(year => (
                                    <option key={year} value={String(year)}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="chart-container line-chart-container" dir="ltr">
                    {contractsChartDataset.length > 0 ? (
                        <LineChart
                            key={`contracts-${dateRange}-${contractsChartDataset.length}-${chartWidth}`}
                            dataset={contractsChartDataset}
                            xAxis={[{
                                dataKey: 'date',
                                scaleType: 'time',
                                valueFormatter: (date) => date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }),
                                tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                            }]}
                            yAxis={[{
                                tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                tickMinStep: 1,
                                min: 0,
                            }]}
                            series={[{
                                dataKey: 'analyzed',
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
                            grid={{ vertical: true, horizontal: true }}
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
                            {['7d', '30d', 'month', 'year', 'all'].map(range => (
                                <button
                                    key={range}
                                    className={`range-btn ${userDateRange === range ? 'active' : ''}`}
                                    onClick={() => setUserDateRange(range)}
                                >
                                    {range === '7d' ? `7 ${t('admin.days')}` :
                                        range === '30d' ? `30 ${t('admin.days')}` :
                                            range === 'month' ? t('admin.thisMonth') :
                                                range === 'year' ? t('admin.thisYear') :
                                                    t('admin.allTime') || 'הכל'}
                                </button>
                            ))}
                            <select
                                className="year-picker"
                                value={userDateRange.match(/^\d{4}$/) ? userDateRange : ''}
                                onChange={(e) => e.target.value && setUserDateRange(e.target.value)}
                            >
                                <option value="" disabled>{t('admin.selectYear') || 'Year'}</option>
                                {[2026, 2025].map(year => (
                                    <option key={year} value={String(year)}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="chart-container line-chart-container" dir="ltr">
                    {userChartDataset.length > 0 ? (
                        <LineChart
                            key={`users-${userDateRange}-${userChartDataset.length}-${chartWidth}`}
                            dataset={userChartDataset}
                            xAxis={[{
                                dataKey: 'date',
                                scaleType: 'time',
                                valueFormatter: (date) => date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }),
                                tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
                            }]}
                            yAxis={[{
                                tickLabelStyle: { fill: labelColor, fontSize: 11 },
                                tickMinStep: 1,
                                min: 0,
                            }]}
                            series={[{
                                dataKey: 'count',
                                area: true,
                                showMark: false,
                                color: '#3B82F6',
                            }]}
                            grid={{ vertical: true, horizontal: true }}
                            width={chartWidth}
                            height={220}
                            sx={{
                                '& .MuiAreaElement-root': { fillOpacity: 0.25 },
                                '& .MuiChartsAxis-tickLabel': { fill: labelColor },
                                '& .MuiChartsAxis-line': { stroke: labelColor },
                                '& .MuiChartsGrid-line': { stroke: gridColor },
                            }}
                        />
                    ) : (
                        <div className="no-data">{t('admin.noData')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardCharts;