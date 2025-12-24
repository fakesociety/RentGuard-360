import React from 'react';
import { Lightbulb, Check } from 'lucide-react';
import './RecommendationCard.css';

/**
 * RecommendationCard - Modern SaaS-style callout for fix suggestions
 * Premium design with subtle background and ghost button
 */
const RecommendationCard = ({
    title = 'הצעה לתיקון',
    suggestion,
    onApply,
    isApplied = false
}) => {
    if (!suggestion) return null;

    return (
        <div className="recommendation-card">
            {/* Left accent border is handled by CSS */}

            <div className="recommendation-content">
                {/* Header with icon and title */}
                <div className="recommendation-header">
                    <Lightbulb className="recommendation-icon" size={18} />
                    <span className="recommendation-title">{title}</span>
                </div>

                {/* Suggestion text */}
                <p className="recommendation-card-text" dir="rtl">
                    {suggestion}
                </p>

                {/* Ghost/Outline Apply Button */}
                <button
                    className={`recommendation-apply-btn ${isApplied ? 'applied' : ''}`}
                    onClick={onApply}
                    disabled={isApplied}
                >
                    <Check size={16} />
                    <span>{isApplied ? 'הוחל' : 'החל תיקון'}</span>
                </button>
            </div>
        </div>
    );
};

export default RecommendationCard;
