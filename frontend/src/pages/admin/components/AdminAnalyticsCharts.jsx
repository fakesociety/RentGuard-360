import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { BarChart } from '@mui/x-charts/BarChart';
import { useAnimate, useAnimateBar, useDrawingArea } from '@mui/x-charts/hooks';
import { interpolateObject } from 'd3-interpolate';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FileText } from 'lucide-react';

export const AdminAnalyticsCharts = ({ commonIssues, loading }) => {
    const { t } = useLanguage();
    const { isDark } = useTheme();
    const isMobile = useMediaQuery('(max-width:480px)');
    
    const chartContainerRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(500);
    const labelColor = isDark ? '#94a3b8' : '#475569';

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

    return (
        <div className="analytics-card analytics-card-full" ref={chartContainerRef}>
            <h3>
                <FileText size={16} />
                {t('admin.commonIssues') || 'בעיות נפוצות בחוזים'}
            </h3>
            {commonIssues.length > 0 ? (
                <div className="bar-chart-section">
                    {/* Chart with short labels */}
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
                <div className="no-data" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    {t('admin.noIssuesYet') || 'עדיין לא נמצאו בעיות - העלה חוזים לניתוח'}
                </div>
            )}
        </div>
    );
};

// --- Helper Components for Shiny Chart ---

function BarShadedBackground(props) {
    const {
        ownerState,
        dataIndex: _dataIndex,
        xOrigin: _xOrigin,
        yOrigin: _yOrigin,
        skipAnimation: _skipAnimation,
        ...svgProps
    } = props;
    const { isDark } = useTheme();

    const animatedProps = useAnimateBar(props);
    const {
        dataIndex: _animatedDataIndex,
        xOrigin: _animatedXOrigin,
        yOrigin: _animatedYOrigin,
        skipAnimation: _animatedSkipAnimation,
        ...safeAnimatedProps
    } = animatedProps || {};

    const { width: drawingWidth } = useDrawingArea();

    return (
        <React.Fragment>
            <rect
                {...svgProps}
                fill={isDark ? '#f8fafc' : '#1a1a2e'}
                opacity={0.05}
                x={svgProps.x}
                width={drawingWidth}
                style={{ rx: 4 }}
            />
            <rect
                {...svgProps}
                filter={ownerState?.isHighlighted ? 'brightness(120%)' : undefined}
                opacity={ownerState?.isFaded ? 0.3 : 1}
                style={{ rx: 4 }}
                {...safeAnimatedProps}
            />
        </React.Fragment>
    );
}

const Text = styled('text')(({ theme }) => ({
    ...theme?.typography?.body2,
    fill: '#ffffff',
    transition: 'opacity 0.2s ease-in, fill 0.2s ease-in',
    textAnchor: 'start',
    dominantBaseline: 'central',
    pointerEvents: 'none',
    fontWeight: 600,
    fontSize: '0.75rem',
    textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
}));

function BarLabelAtBase(props) {
    const {
        xOrigin,
        y,
        height,
        skipAnimation,
        dataIndex: _dataIndex,
        yOrigin: _yOrigin,
        ...otherProps
    } = props;

    const animatedProps = useAnimate(
        { x: xOrigin + 8, y: y + height / 2 },
        {
            initialProps: { x: xOrigin, y: y + height / 2 },
            createInterpolator: interpolateObject,
            transformProps: (p) => p,
            applyProps: (element, p) => {
                element.setAttribute('x', p.x.toString());
                element.setAttribute('y', p.y.toString());
            },
            skip: skipAnimation,
        },
    );

    return <Text {...otherProps} {...animatedProps} />;
}
