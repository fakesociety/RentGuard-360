import React from 'react';
import { 
    AlertTriangle,
    Info,
    CheckCircle2,
    Loader2,
    Sparkles,
    Pen,
    ChevronDown,
    ChevronLeft,
    Undo2
} from 'lucide-react';
import RecommendationCard from '../RecommendationCard';

const ClauseRow = ({
    clause,
    readOnly,
    t,
    getClauseText,
    clauseExplanations,
    consultingClauseId,
    handleConsultClause,
    expandedExplanations,
    toggleExplanation,
    editedClauses,
    updateEditedClauses,
    onClauseChange,
    requestRevert,
    openEditor
}) => {
    const renderRiskIcon = (level) => {
        switch (level) {
            case 'High': return <AlertTriangle size={16} strokeWidth={2.5} />;
            case 'Medium': return <Info size={16} strokeWidth={2.5} />;
            case 'Low': return <CheckCircle2 size={16} strokeWidth={2.5} />;
            default: return <Info size={16} strokeWidth={2.5} />;
        }
    };

    const isRecommendationApplied = !!editedClauses[clause.id] && 
        (editedClauses[clause.id].action === 'accepted' || editedClauses[clause.id].text === clause.issue?.suggested_fix);

    return (
        <div className="lf-cv-clause-row">
            {/* Issue indicator */}
            {clause.hasIssue && clause.issue && (
                <div className={`lf-cv-issue-indicator ${clause.issue.risk_level?.toLowerCase()}`}>
                    {renderRiskIcon(clause.issue.risk_level)}
                    <span className="lf-cv-issue-topic">{clause.issue.clause_topic}</span>
                </div>
            )}

            {/* Clause content */}
            <div
                className={`lf-cv-clause-box ${clause.hasIssue ? 'has-issue' : ''} ${clause.isEdited ? 'is-edited' : ''} ${readOnly ? 'read-only' : ''}`}
                onClick={readOnly ? undefined : () => openEditor(clause)}
            >
                <div className="lf-cv-clause-text-area" dir="rtl">
                    <p className="lf-cv-clause-text" dir="rtl">
                        {getClauseText(clause)}
                    </p>

                    {!readOnly && !clauseExplanations[clause.id] && (
                        <div className="lf-cv-clause-actions no-print">
                            <button
                                className="lf-cv-action-btn consult-btn"
                                onClick={(e) => handleConsultClause(clause, e)}
                                disabled={consultingClauseId === clause.id}
                                title={t('contractView.getClauseExplanation')}
                            >
                                {consultingClauseId === clause.id 
                                    ? <Loader2 className="spin" size={16} /> 
                                    : <Sparkles size={16} />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Edit Hint Overlay */}
                {!readOnly && (
                    <div className="lf-cv-hover-hint no-print">
                        <Pen size={14} /> {t('contractView.edit')}
                    </div>
                )}

                {/* Manual Edit Footer Actions */}
                {!readOnly && clause.isEdited && !isRecommendationApplied && (
                    <div className="lf-cv-clause-edit-footer no-print">
                        <button
                            className="lf-cv-action-btn revert-btn"
                            onClick={(e) => requestRevert(clause.id, e)}
                            title={t('contractView.revertToOriginal')}
                        >
                            <Undo2 size={16} />
                            <span>{t('contractView.revertToOriginal')}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* AI Explanation Box */}
            {clauseExplanations[clause.id] && (
                <div className={`lf-cv-ai-explanation no-print ${expandedExplanations[clause.id] ? 'expanded' : 'minimized'}`}>
                    <div className="lf-cv-ai-header" onClick={() => toggleExplanation(clause.id)}>
                        <span className="lf-cv-ai-title">
                            <Sparkles size={16} /> {t('contractView.aiExplanation')}
                        </span>
                        <button className="lf-cv-toggle-btn">
                            {expandedExplanations[clause.id] ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                    {expandedExplanations[clause.id] && (
                        <div className="lf-cv-ai-content" dir="rtl">
                            {clauseExplanations[clause.id]}
                        </div>
                    )}
                </div>
            )}

            {/* Suggested Fix Card (External Component) */}
            {!readOnly && clause.hasIssue && clause.issue?.suggested_fix && (
                <div className="lf-cv-recommendation-wrapper">
                    <RecommendationCard
                        title={t('contractView.fixSuggestion')}
                        suggestion={clause.issue.suggested_fix}
                        isApplied={isRecommendationApplied}
                        onApply={() => {
                            updateEditedClauses(prev => ({
                                ...prev,
                                [clause.id]: { text: clause.issue.suggested_fix, action: 'accepted' }
                            }));
                            onClauseChange?.(clause.id, clause.issue.suggested_fix, 'accepted');
                        }}
                        onRevert={(e) => requestRevert(clause.id, e)}
                    />
                </div>
            )}
        </div>
    );
};

export default ClauseRow;
