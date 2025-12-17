import React from 'react';
import './ScoreBreakdown.css';

/**
 * ScoreBreakdown Component
 * Displays overall risk score and 5-category breakdown
 * 
 * Props:
 * - overallScore: number (0-100)
 * - breakdown: object with category scores
 * - issues: array of issues with rule_id, penalty_points, etc.
 */
const ScoreBreakdown = ({ overallScore = 0, breakdown = {}, issues = [] }) => {
    // Default category structure
    const defaultBreakdown = {
        financial_terms: { score: 20, deductions: [] },
        tenant_rights: { score: 20, deductions: [] },
        termination_clauses: { score: 20, deductions: [] },
        liability_repairs: { score: 20, deductions: [] },
        legal_compliance: { score: 20, deductions: [] }
    };

    const categories = { ...defaultBreakdown, ...breakdown };

    // Category display names and icons
    const categoryInfo = {
        financial_terms: { name: 'Financial Terms', icon: '💰', maxScore: 20 },
        tenant_rights: { name: 'Tenant Rights', icon: '🏠', maxScore: 20 },
        termination_clauses: { name: 'Termination & Exit', icon: '🚪', maxScore: 20 },
        liability_repairs: { name: 'Liability & Repairs', icon: '🔧', maxScore: 20 },
        legal_compliance: { name: 'Legal Compliance', icon: '⚖️', maxScore: 20 }
    };

    // Get color class based on score
    const getScoreColor = (score, maxScore = 100) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return 'excellent';
        if (percentage >= 60) return 'good';
        if (percentage >= 40) return 'warning';
        return 'danger';
    };

    // Get risk level label
    const getRiskLevel = (score) => {
        if (score >= 86) return 'Low Risk';
        if (score >= 71) return 'Low-Medium Risk';
        if (score >= 51) return 'Medium Risk';
        if (score >= 31) return 'Medium-High Risk';
        return 'High Risk';
    };

    // Get deductions for a category from issues
    const getCategoryDeductions = (categoryKey) => {
        const prefixMap = {
            financial_terms: 'F',
            tenant_rights: 'T',
            termination_clauses: 'E',
            liability_repairs: 'L',
            legal_compliance: 'C'
        };
        const prefix = prefixMap[categoryKey];
        return issues.filter(issue => issue.rule_id?.startsWith(prefix));
    };

    return (
        <div className="score-breakdown">
            {/* Overall Score Circle */}
            <div className={`overall-score ${getScoreColor(overallScore)}`}>
                <div className="score-circle">
                    <svg viewBox="0 0 100 100" className="score-ring">
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="var(--bg-tertiary)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={`${overallScore * 2.83} 283`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            className="score-progress"
                        />
                    </svg>
                    <div className="score-value">
                        <span className="score-number">{overallScore}</span>
                        <span className="score-max">/100</span>
                    </div>
                </div>
                <div className="score-label">{getRiskLevel(overallScore)}</div>
            </div>

            {/* Category Breakdown */}
            <div className="categories-breakdown">
                <h3 className="breakdown-title">Score Breakdown</h3>
                <div className="categories-list">
                    {Object.entries(categories).map(([key, data]) => {
                        const info = categoryInfo[key];
                        const deductions = getCategoryDeductions(key);
                        const categoryScore = data.score ?? 20;
                        const penaltyPoints = 20 - categoryScore;

                        return (
                            <div key={key} className="category-item">
                                <span className="category-icon">{info.icon}</span>
                                <span className="category-name">{info.name}</span>
                                <div className="category-bar">
                                    <div
                                        className={`category-progress ${getScoreColor(categoryScore, 20)}`}
                                        style={{ width: `${(categoryScore / 20) * 100}%` }}
                                    />
                                </div>
                                <span className={`category-score ${getScoreColor(categoryScore, 20)}`}>
                                    {categoryScore}/{info.maxScore}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Score Legend */}
            <div className="score-legend">
                <div className="legend-item excellent"><span className="dot"></span> 86-100: Low Risk</div>
                <div className="legend-item good"><span className="dot"></span> 71-85: Low-Medium</div>
                <div className="legend-item warning"><span className="dot"></span> 51-70: Medium</div>
                <div className="legend-item danger"><span className="dot"></span> 0-50: High Risk</div>
            </div>
        </div>
    );
};

export default ScoreBreakdown;
