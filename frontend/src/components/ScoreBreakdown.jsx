/**
 * ============================================
 *  ScoreBreakdown
 *  Risk Score Visualization with Categories
 * ============================================
 * 
 * STRUCTURE:
 * - Circular progress ring (overall score)
 * - 5-category breakdown bars
 * - Score legend
 * 
 * FEATURES:
 * - Animated SVG score ring
 * - Color-coded risk levels (4 tiers)
 * - Category progress bars with icons
 * 
 * PROPS:
 * - overallScore: number (0-100)
 * - breakdown: { category: { score, deductions } }
 * - issues: array with rule_id for deduction mapping
 * 
 * RISK THRESHOLDS:
 * - 86-100: Low Risk (green)
 * - 71-85: Low-Medium Risk (teal)
 * - 51-70: Medium Risk (orange)
 * - 0-50: High Risk (red)
 * 
 * ============================================
 */
import React from 'react';
import { BadgeDollarSign, House, FileText, Wrench, Scale } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './ScoreBreakdown.css';

const ScoreBreakdown = ({ overallScore = 0, breakdown = {} }) => {
    const { t, isRTL } = useLanguage();

    // Default category structure
    const defaultBreakdown = {
        financial_terms: { score: 20, deductions: [] },
        tenant_rights: { score: 20, deductions: [] },
        termination_clauses: { score: 20, deductions: [] },
        liability_repairs: { score: 20, deductions: [] },
        legal_compliance: { score: 20, deductions: [] }
    };

    const categories = { ...defaultBreakdown, ...breakdown };

    // Category display names with professional icons
    const getCategoryInfo = () => ({
        financial_terms: { name: t('score.financialTerms'), icon: BadgeDollarSign, maxScore: 20 },
        tenant_rights: { name: t('score.tenantRights'), icon: House, maxScore: 20 },
        termination_clauses: { name: t('score.terminationClauses'), icon: FileText, maxScore: 20 },
        liability_repairs: { name: t('score.liabilityRepairs'), icon: Wrench, maxScore: 20 },
        legal_compliance: { name: t('score.legalCompliance'), icon: Scale, maxScore: 20 }
    });

    const categoryInfo = getCategoryInfo();
    const legendItems = [
        { key: 'excellent', range: '86-100', label: t('score.lowRisk') },
        { key: 'good', range: '71-85', label: t('score.lowMediumRisk') },
        { key: 'warning', range: '51-70', label: t('score.mediumRisk') },
        { key: 'danger', range: '0-50', label: t('score.highRisk') }
    ];

    // Get color class based on score - matches legend thresholds
    const getScoreColor = (score, maxScore = 100) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 86) return 'excellent';  // 86-100: Low Risk
        if (percentage >= 71) return 'good';       // 71-85: Low-Medium Risk
        if (percentage >= 51) return 'warning';    // 51-70: Medium Risk
        return 'danger';                           // 0-50: High Risk
    };

    // Get risk level label - bilingual (matches legend: 4 levels)
    const getRiskLevel = (score) => {
        if (score >= 86) return t('score.lowRisk');           // 86-100
        if (score >= 71) return t('score.lowMediumRisk');     // 71-85
        if (score >= 51) return t('score.mediumRisk');        // 51-70
        return t('score.highRisk');                           // 0-50
    };

    return (
        <div className="score-breakdown" dir={isRTL ? 'rtl' : 'ltr'}>
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
                <h3 className="breakdown-title">{t('analysis.scoreBreakdown')}</h3>
                <div className="categories-list">
                    {Object.entries(categories).map(([key, data]) => {
                        const info = categoryInfo[key];
                        const CategoryIcon = info.icon;
                        const categoryScore = data.score ?? 20;

                        return (
                            <div key={key} className={`category-item category-${key}`}>
                                <span className={`category-icon icon-${key}`} aria-hidden="true">
                                    <CategoryIcon size={16} strokeWidth={2} />
                                </span>
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
                {legendItems.map((item) => (
                    <div key={item.key} className={`legend-item ${item.key}`}>
                        <div className="legend-item-main">
                            <span className="dot"></span>
                            <span className="legend-label">{item.label}</span>
                        </div>
                        <span className="legend-range">{item.range}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScoreBreakdown;
