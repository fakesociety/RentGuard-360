/**
 * ============================================
 *  AdminDashboardCharts Component
 *  Charts and graphs for the main dashboard
 * ============================================
 *
 * STRUCTURE:
 * - Contracts over time chart
 * - User registrations chart
 *
 * DEPENDENCIES:
 * - DateRangeSelector
 * - chartUIUtils (CHART_COLORS)
 * ============================================
 */
import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { LineChart } from '@mui/x-charts/LineChart';
import { TrendingUp, UserPlus } from 'lucide-react';
import { CHART_COLORS } from '@/features/admin/utils/chartUIUtils';
import DateRangeSelector from '@/features/admin/components/DateRangeSelector';
import './AdminDashboardCharts.css';

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

    const chartSx = {
        '& .MuiAreaElement-root': { fillOpacity: 0.3 },
        '& .MuiChartsAxis-tickLabel': { fill: labelColor },
        '& .MuiChartsAxis-line': { stroke: labelColor },
        '& .MuiChartsGrid-line': { stroke: gridColor },
    };

    const xAxisConfig = {
        dataKey: 'date',
        scaleType: 'time',
        valueFormatter: (date) => date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }),
        tickLabelStyle: { fill: labelColor, fontSize: 10, angle: -45, textAnchor: 'end' },
    };

    const yAxisConfig = {
        tickLabelStyle: { fill: labelColor, fontSize: 11 },
        tickMinStep: 1,
        min: 0,
    };

    return (
        <div className="dashboard-charts-row">
            {/* Contracts Over Time */}
            <div className="dashboard-chart-card" ref={chartContainerRef}>
                <div className="chart-header">
                    <h3>
                        <TrendingUp size={16} />
                        {t('admin.analyzedOverTime')}
                    </h3>
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                </div>
                <div className="chart-container line-chart-container" dir="ltr">
                    {contractsChartDataset.length > 0 ? (
                        <LineChart
                            key={`contracts-${dateRange}-${contractsChartDataset.length}-${chartWidth}`}
                            dataset={contractsChartDataset}
                            xAxis={[xAxisConfig]}
                            yAxis={[yAxisConfig]}
                            series={[{
                                dataKey: 'analyzed',
                                area: true,
                                color: CHART_COLORS[1],
                                showMark: false,
                            }]}
                            width={chartWidth}
                            height={220}
                            sx={chartSx}
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
                        {t('admin.userRegistrations')}
                    </h3>
                    <DateRangeSelector value={userDateRange} onChange={setUserDateRange} />
                </div>
                <div className="chart-container line-chart-container" dir="ltr">
                    {userChartDataset.length > 0 ? (
                        <LineChart
                            key={`users-${userDateRange}-${userChartDataset.length}-${chartWidth}`}
                            dataset={userChartDataset}
                            xAxis={[xAxisConfig]}
                            yAxis={[yAxisConfig]}
                            series={[{
                                dataKey: 'count',
                                area: true,
                                showMark: false,
                                color: CHART_COLORS[7],
                            }]}
                            grid={{ vertical: true, horizontal: true }}
                            width={chartWidth}
                            height={220}
                            sx={{
                                ...chartSx,
                                '& .MuiAreaElement-root': { fillOpacity: 0.25 },
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