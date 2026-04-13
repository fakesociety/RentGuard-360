/**
 * ============================================
 *  AdminAnalyticsCharts Component
 *  Deep-dive charts for analytics
 * ============================================
 *
 * STRUCTURE:
 * - Common issues bar chart
 * - Legend table
 *
 * DEPENDENCIES:
 * - CustomChartElements (BarShadedBackground, BarLabelAtBase)
 * - chartUIUtils (getLabelColor)
 * ============================================
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BarChart } from '@mui/x-charts/BarChart';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FileText } from 'lucide-react';
import { getLabelColor } from '@/features/admin/utils/chartUIUtils';
import { BarShadedBackground, BarLabelAtBase } from '@/features/admin/components/charts/CustomChartElements';
import './AdminAnalyticsCharts.css';

export const AdminAnalyticsCharts = ({ commonIssues, loading }) => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const isMobile = useMediaQuery('(max-width:480px)');

    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(500);
    const labelColor = getLabelColor(isDark);

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

    return (
        <div className="analytics-card analytics-card-full" ref={chartContainerRef}>
            <h3>
                <FileText size={20} className="icon-filled" />
                {t('admin.commonIssues')}
            </h3>
            {commonIssues.length > 0 ? (
                <div className="bar-chart-section">
                    <div className="bar-chart-wrapper" dir="ltr">
                        <BarChart
                            layout="horizontal"
                            dataset={commonIssues}
                            yAxis={[{
                                scaleType: 'band',
                                dataKey: 'code',
                                colorMap: {
                                    type: 'ordinal',
                                    colors: commonIssues.map(i => i.color)
                                },
                                tickLabelStyle: {
                                    fill: isDark ? '#ffffff' : labelColor,
                                    fontSize: 12,
                                    fontWeight: 600
                                },
                            }]}
                            xAxis={[{
                                tickLabelStyle: { fill: labelColor, fontSize: 11 },
                            }]}
                            series={[{
                                dataKey: 'count',
                                valueFormatter: (value) => `${value}`,
                            }]}
                            width={isMobile ? Math.min(chartWidth, 320) : Math.min(chartWidth, 600)}
                            height={isMobile ? 180 : 250}
                            margin={{ left: 40, right: 15, top: 10, bottom: 25 }}
                            slots={{
                                bar: BarShadedBackground,
                                barLabel: BarLabelAtBase
                            }}
                            barLabel={(v) => v.value}
                        />
                    </div>
                    <div className="bar-chart-legend">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('admin.code')}</th>
                                    <th>{t('admin.issue')}</th>
                                    <th>{t('admin.count')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commonIssues.map((issue) => (
                                    <tr key={issue.code}>
                                        <td className="code-cell">
                                            <span className="code-badge" style={{ backgroundColor: issue.color }}>
                                                {issue.code}
                                            </span>
                                        </td>
                                        <td className="issue-cell">{issue.topic}</td>
                                        <td className="count-cell">{issue.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="no-data no-data-padded">
                    {t('admin.noIssuesYet')}
                </div>
            )}
        </div>
    );
};
