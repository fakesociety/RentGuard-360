import React, { useState, useEffect } from 'react';
import './RiskGauge.css';

/**
 * RiskGauge - Premium Risk Score Visualization
 * 
 * Features:
 * - Smooth gradient arc (green → yellow → red)
 * - Animated progress from 0 to score
 * - Glow effect matching risk level
 * - Score displayed in center
 * 
 * @param {number} score - Risk score 0-100
 * @param {number} size - Size in pixels (default: 80)
 * @param {boolean} animate - Enable mount animation (default: true)
 */
const RiskGauge = ({ score = 0, size = 80, animate = true }) => {
    const [displayScore, setDisplayScore] = useState(animate ? 0 : score);

    // Animate score on mount
    useEffect(() => {
        if (!animate) {
            setDisplayScore(score);
            return;
        }

        const duration = 800; // ms
        const startTime = Date.now();
        const startScore = 0;

        const animateScore = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentScore = Math.round(startScore + (score - startScore) * eased);

            setDisplayScore(currentScore);

            if (progress < 1) {
                requestAnimationFrame(animateScore);
            }
        };

        requestAnimationFrame(animateScore);
    }, [score, animate]);

    // Calculate arc parameters
    const strokeWidth = 8;
    const radius = 40;
    const circumference = Math.PI * radius; // Half circle
    const progressOffset = circumference - (displayScore / 100) * circumference;

    // Determine risk level for glow color
    // Higher score = LOWER risk (green), Lower score = HIGHER risk (red)
    const getRiskLevel = (s) => {
        if (s >= 86) return 'excellent';  // 86-100: Low Risk (green)
        if (s >= 71) return 'good';       // 71-85: Low-Medium Risk (teal)
        if (s >= 51) return 'medium';     // 51-70: Medium Risk (orange)
        return 'high';                    // 0-50: High Risk (red)
    };

    const riskLevel = getRiskLevel(displayScore);

    // Glow colors matching the 4 risk levels
    const glowColors = {
        excellent: 'rgba(52, 199, 89, 0.5)',   // Green
        good: 'rgba(20, 184, 166, 0.5)',       // Teal
        medium: 'rgba(245, 158, 11, 0.5)',    // Orange
        high: 'rgba(239, 68, 68, 0.5)'        // Red
    };

    return (
        <div
            className={`risk-gauge risk-${riskLevel}`}
            style={{
                width: size,
                height: size * 0.7,
                '--glow-color': glowColors[riskLevel]
            }}
        >
            <svg
                viewBox="0 0 100 60"
                className="gauge-arc-svg"
            >
                {/* Gradient definition - Red (low score/high risk) → Yellow → Green (high score/low risk) */}
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background arc (gray track) */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke="rgba(100, 116, 139, 0.3)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="gauge-track"
                />

                {/* Gradient arc (full) */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="gauge-gradient-bg"
                    style={{ opacity: 0.25 }}
                />

                {/* Progress arc with gradient */}
                <path
                    d="M 10 55 A 40 40 0 0 1 90 55"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    className="gauge-progress"
                    filter="url(#glow)"
                    style={{
                        transition: animate ? 'none' : 'stroke-dashoffset 0.5s ease-out'
                    }}
                />

                {/* Indicator dot at the end of progress */}
                <circle
                    cx={50 + 40 * Math.cos(Math.PI - (displayScore / 100) * Math.PI)}
                    cy={55 - 40 * Math.sin((displayScore / 100) * Math.PI)}
                    r="5"
                    className="gauge-indicator"
                    filter="url(#glow)"
                />
            </svg>

            {/* Score number */}
            <div className="gauge-score">
                {displayScore}
            </div>
        </div>
    );
};

export default RiskGauge;
