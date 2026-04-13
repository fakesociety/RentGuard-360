/**
 * ============================================
 *  CustomChartElements
 *  Reusable chart slot components for MUI X Charts
 * ============================================
 *
 * STRUCTURE:
 * - BarShadedBackground: Shaded background bar effect
 * - StyledBarLabel: Styled text element for bar labels
 * - BarLabelAtBase: Animated label positioned at bar base
 *
 * DEPENDENCIES:
 * - @mui/x-charts hooks
 * - d3-interpolate
 * ============================================
 */
import React from 'react';
import { useAnimate, useAnimateBar, useDrawingArea } from '@mui/x-charts/hooks';
import { interpolateObject } from 'd3-interpolate';
import { styled } from '@mui/material/styles';

export function BarShadedBackground(props) {
    const {
        ownerState,
        dataIndex: _dataIndex,
        xOrigin: _xOrigin,
        yOrigin: _yOrigin,
        skipAnimation: _skipAnimation,
        ...svgProps
    } = props;

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
                className="bar-chart-shaded-bg"
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

export const StyledBarLabel = styled('text')(({ theme }) => ({
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

export function BarLabelAtBase(props) {
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

    return <StyledBarLabel {...otherProps} {...animatedProps} />;
}
