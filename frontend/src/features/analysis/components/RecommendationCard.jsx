/**
 * ============================================
 *  RecommendationCard
 *  AI Fix Suggestion Callout
 * ============================================
 * 
 * STRUCTURE:
 * - Header with lightbulb icon
 * - Suggestion text
 * - Apply/Revert action buttons
 * 
 * PROPS:
 * - title: string (default: 'הצעה לתיקון')
 * - suggestion: string (fix text)
 * - onApply: callback
 * - onRevert: callback
 * - isApplied: boolean
 * 
 * ============================================
 */
import React from 'react';
import { Lightbulb, Check, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './RecommendationCard.css';

const RecommendationCard = ({
    title,
    suggestion,
    onApply,
    onRevert,
    isApplied = false
}) => {
    const { t, isRTL } = useLanguage();
    const cardTitle = title || t('recommendationCard.defaultTitle');

    if (!suggestion) return null;

    return (
        <div className="recommendation-card">
            {/* Left accent border is handled by CSS */}

            <div className="recommendation-content">
                {/* Header with icon and title */}
                <div className="recommendation-header">
                    <Lightbulb className="recommendation-icon" size={18} />
                    <span className="recommendation-title">{cardTitle}</span>
                </div>

                {/* Suggestion text */}
                <p className="recommendation-card-text" dir="auto">
                    {suggestion}
                </p>

                {/* Action Buttons */}
                <div className="recommendation-actions">
                    {isApplied ? (
                        <div className="applied-state">
                            <span className="applied-badge">
                                <Check size={14} />
                                {t('recommendationCard.applied')}
                            </span>
                            <button
                                className="recommendation-revert-btn"
                                onClick={onRevert}
                                title={t('recommendationCard.revertTitle')}
                            >
                                <RotateCcw size={14} />
                                <span>{t('recommendationCard.revert')}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            className="recommendation-apply-btn"
                            onClick={onApply}
                        >
                            <Check size={16} />
                            <span>{t('recommendationCard.applyFix')}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
