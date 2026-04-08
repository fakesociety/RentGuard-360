import React from 'react';
import { ChevronDown, AlertTriangle, Wand2, Copy, Check, Lightbulb } from 'lucide-react';
import ContractView from '../../../components/domain/ContractView';

const AnalysisResults = ({
    activeTab,
    issues,
    result,
    analysis,
    contractId,
    expandedIssue,
    setExpandedIssue,
    copiedIndex,
    setCopiedIndex,
    contractViewRef,
    contractEditState,
    setContractEditState,
    editedClauses,
    setEditedClauses,
    handleSaveToCloud,
    copyTextToClipboard,
    showExportNotice,
    t,
    getRiskLabel,
    pickInlineText,
    pickBlockText,
    exportEditedContract
}) => {
    // Left Column: Issues List or Contract View

    if (activeTab === 'issues') {
        if (issues.length === 0) {
            return (
                <div className="lf-no-issues">
                    {result?.is_contract === false ? (
                        <>
                            <AlertTriangle size={48} className="warning-icon" />
                            <h3>{t('analysis.notRentalTitle')}</h3>
                            <p>{t('analysis.notRentalDescription')}</p>
                        </>
                    ) : (
                        <>
                            <div className="success-icon">✓</div>
                            <h3>{t('analysis.noIssues')}</h3>
                            <p>{t('analysis.noIssuesDescription')}</p>
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="lf-issues-list">
                {issues.map((issue, index) => {
                    const riskClass = getRiskLabel(issue.risk_level);
                    const isExpanded = expandedIssue === index;
                    const clauseTitle =
                        pickInlineText(
                            issue.clause_topic,
                            issue.title,
                            issue.section_title,
                            issue.heading,
                            issue.topic
                        ) ||
                        t('analysis.untitledClause') ||
                        'Untitled clause';
                    const clauseOriginal = pickBlockText(
                        issue.original_text,
                        issue.original,
                        issue.clause_text,
                        issue.clause
                    );
                    const clauseExplanation = pickBlockText(
                        issue.explanation,
                        issue.problem,
                        issue.why_it_matters,
                        issue.description,
                        issue.details
                    );
                    const clauseFix = pickBlockText(
                        issue.suggested_fix,
                        issue.recommendation,
                        issue.suggestedFix,
                        issue.solution,
                        issue.fix
                    );
                    const clauseTip = pickBlockText(issue.negotiation_tip, issue.tip, issue.negotiationTip);
                    const clausePreview =
                        pickInlineText(clauseExplanation, clauseOriginal) ||
                        t('analysis.noDetailedContent') ||
                        'No detailed analysis available yet.';

                    const handleCopy = async (text, idx) => {
                        try {
                            const copied = await copyTextToClipboard(text);
                            if (!copied) {
                                showExportNotice(t('analysis.shareCopyFailed'));
                                return;
                            }
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                        } catch (err) {
                            console.error('Failed to copy:', err);
                            showExportNotice(t('analysis.shareCopyFailed'));
                        }
                    };

                    return (
                        <div key={index} className={`lf-clause-card ${isExpanded ? 'expanded' : ''}`}>
                            <div className={`lf-risk-line border-${riskClass}`}></div>
                            
                            <div
                                className="lf-clause-header"
                                onClick={() => {
                                    const selectedText = window.getSelection?.()?.toString()?.trim();
                                    if (selectedText) return;
                                    setExpandedIssue(isExpanded ? null : index);
                                }}
                            >
                                <div className="lf-clause-title-area">
                                    <div className="lf-clause-badges">
                                        <span className={`lf-badge bg-${riskClass}`}>
                                            {issue.risk_level === 'High' && t('score.highRisk')}
                                            {issue.risk_level === 'Medium' && t('score.mediumRisk')}
                                            {issue.risk_level === 'Low' && t('score.lowRisk')}
                                        </span>
                                        {issue.penalty_points && (
                                            <span className="lf-badge-points">-{issue.penalty_points} {t('analysis.points')}</span>
                                        )}
                                    </div>
                                    <h3>{clauseTitle}</h3>
                                    <p className="lf-clause-preview">{clausePreview}</p>
                                </div>
                                <button className="lf-expand-btn">
                                    <ChevronDown size={20} className={isExpanded ? 'rotated' : ''} />
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="lf-clause-body">
                                    {clauseOriginal && (
                                        <div className="lf-quote-box">
                                            <span className="material-symbols-outlined lf-quote-icon">format_quote</span>
                                            <p>"{clauseOriginal}"</p>
                                        </div>
                                    )}

                                    <div className="lf-analysis-grid">
                                        {clauseExplanation && (
                                            <div className="lf-analysis-item">
                                                <div className="lf-item-icon bg-error">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div className="lf-item-text">
                                                    <h4>{t('analysis.theIssue')}</h4>
                                                    <p>{clauseExplanation}</p>
                                                </div>
                                            </div>
                                        )}

                                        {clauseFix && (
                                            <div className="lf-analysis-item">
                                                <div className="lf-item-icon bg-primary">
                                                    <Wand2 size={20} />
                                                </div>
                                                <div className="lf-item-text">
                                                    <h4>{t('analysis.negotiationStrategy')}</h4>
                                                    <p>{clauseFix}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {clauseFix && (
                                        <div className="lf-clause-actions">
                                            <button 
                                                className={`lf-btn-primary ${copiedIndex === index ? 'copied' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleCopy(clauseFix, index); }}
                                            >
                                                {copiedIndex === index ? <Check size={18} /> : <Copy size={18} />}
                                                {copiedIndex === index ? t('analysis.copied') : t('analysis.copyFix')}
                                            </button>
                                            
                                            {clauseTip && (
                                                <div className="lf-tip-box">
                                                    <Lightbulb size={16} />
                                                    <span>{clauseTip}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    if (activeTab === 'contract') {
        if (result?.is_contract === false) {
            return (
                <div className="lf-no-issues">
                    <AlertTriangle size={48} className="warning-icon" />
                    <h3>{t('analysis.notRentalTitle')}</h3>
                    <p>{t('analysis.notRentalContentDescription')}</p>
                </div>
            );
        }

        return (
            <div className="lf-contract-view-wrapper">
                <ContractView
                    ref={contractViewRef}
                    contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                    backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                    issues={issues}
                    contractId={analysis?.contractId || contractId}
                    initialEditedClauses={editedClauses}
                    onClauseChange={(clauseId, text, action, metadata = {}) => {
                        setEditedClauses(prev => {
                            if (action === 'cleared') {
                                return {};
                            }

                            if (action === 'reverted') {
                                if (!clauseId) return prev;
                                const next = { ...prev };
                                delete next[clauseId];
                                return next;
                            }

                            if (!clauseId) return prev;

                            return {
                                ...prev,
                                [clauseId]: {
                                    ...(prev?.[clauseId] || {}),
                                    ...metadata,
                                    text,
                                    action,
                                },
                            };
                        });
                    }}
                    onEditedClausesChange={setEditedClauses}
                    onExportEdited={async (editedClausesMap) => {
                        const contractText = analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || '';
                        const backendClauses = analysis?.clauses_list || analysis?.clauses || [];
                        await exportEditedContract(contractText, editedClausesMap, issues, 'Edited_Contract', backendClauses);
                    }}
                    onSaveToCloud={handleSaveToCloud}
                    onEditStateChange={setContractEditState}
                />
            </div>
        );
    }

    return null;
};

export default AnalysisResults;