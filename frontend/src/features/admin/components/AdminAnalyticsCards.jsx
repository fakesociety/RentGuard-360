/**
 * ============================================
 *  AdminAnalyticsCards Component
 *  Metric cards for the admin analytics dashboard
 * ============================================
 *
 * STRUCTURE:
 * - Stats grid
 * - Individual stat cards
 *
 * DEPENDENCIES:
 * - chartUIUtils (getRiskLevelLabel)
 * ============================================
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PieChart } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import useMediaQuery from '@mui/material/useMediaQuery';
import { AlertTriangle } from 'lucide-react';
import { getRiskLevelLabel } from '@/features/admin/utils/chartUIUtils';
import './AdminAnalyticsCards.css';

export const AdminAnalyticsCards = ({ pieData, avgRiskScore, riskColor }) => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const isMobile = useMediaQuery('(max-width:480px)');

    const valueTextColor = isDark ? 'var(--color-text-primary, #ffffff)' : 'var(--color-text-primary, #0B0E13)';
    const riskLabel = getRiskLevelLabel(avgRiskScore, t);

    return (
        <div className="analytics-cards-row">
            {/* Risk Distribution Pie Chart */}
            <div className="analytics-card">
                <h3>
                    <AlertTriangle size={20} className="icon-filled" />
                    {t('admin.riskDistribution')}
                </h3>
                <div className="chart-content">
                    <div className="pie-chart-wrapper">
                        <PieChart
                            series={[{
                                data: pieData,
                                innerRadius: isMobile ? 35 : 50,
                                outerRadius: isMobile ? 65 : 90,
                                paddingAngle: 2,
                                cornerRadius: 4,
                                highlightScope: { faded: 'global', highlighted: 'item' },
                            }]}
                            width={isMobile ? 160 : 220}
                            height={isMobile ? 150 : 200}
                            margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                    <AlertTriangle size={20} className="icon-filled" />
                    {t('admin.avgRiskScore')}
                </h3>
                <div className="chart-content gauge-content">
                    <Gauge
                        value={avgRiskScore}
                        valueMin={0}
                        valueMax={100}
                        width={isMobile ? 160 : 200}
                        height={isMobile ? 140 : 180}
                        margin={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        sx={{
                            [`& .${gaugeClasses.valueText}`]: {
                                fontSize: isMobile ? 28 : 36,
                                fontWeight: '700',
                                fill: valueTextColor,
                                fontFamily: 'var(--font-sans, system-ui)'
                            },
                            [`& .${gaugeClasses.valueArc}`]: {
                                fill: riskColor,
                            },
                            [`& .${gaugeClasses.referenceArc}`]: {
                                fill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            },
                        }}
                        text={({ value }) => `${Math.round(value)}/100`}
                    />
                    <p className="gauge-label" style={{ color: riskColor }}>
                        <span className="risk-dot" style={{ backgroundColor: riskColor }}></span>
                        {riskLabel}
                    </p>
                </div>
            </div>
        </div>
    );
};
