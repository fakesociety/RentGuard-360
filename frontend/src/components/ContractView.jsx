import React, { useState, useMemo } from 'react';
import Card from './Card';
import ClauseEditor from './ClauseEditor';
import './ContractView.css';

/**
 * ContractView - Full contract display with clause-level editing
 * Shows all clauses, highlights issues, and enables editing
 */
const ContractView = ({
    contractText = '',
    issues = [],
    onClauseChange,
    onExportEdited,
    onSaveToCloud
}) => {
    const [editedClauses, setEditedClauses] = useState({});
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

    // Parse contract into clauses (simple paragraph-based splitting)
    const clauses = useMemo(() => {
        if (!contractText) return [];

        // Split by double newlines or numbered items
        const parts = contractText
            .split(/\n\n+|\n(?=\d+\.\s)/)
            .filter(p => p.trim().length > 0)
            .map((text, index) => ({
                id: `clause-${index}`,
                text: text.trim(),
                hasIssue: false,
                issue: null
            }));

        // Match issues to clauses
        issues.forEach(issue => {
            const issueText = issue.original_text?.toLowerCase() || '';
            const matchedClause = parts.find(clause =>
                clause.text.toLowerCase().includes(issueText) ||
                issueText.includes(clause.text.toLowerCase().slice(0, 50))
            );
            if (matchedClause) {
                matchedClause.hasIssue = true;
                matchedClause.issue = issue;
            }
        });

        return parts;
    }, [contractText, issues]);

    const handleClauseEdit = (clauseId, newText, action) => {
        setEditedClauses(prev => ({
            ...prev,
            [clauseId]: { text: newText, action }
        }));
        onClauseChange?.(clauseId, newText, action);
        setSaveStatus(null); // Reset save status on new edit
    };

    const handleSaveToCloud = async () => {
        if (!onSaveToCloud) return;

        setIsSaving(true);
        setSaveStatus(null);

        try {
            // Build full edited text
            const fullEditedText = clauses.map(clause => {
                const edit = editedClauses[clause.id];
                if (edit && (edit.action === 'accepted' || edit.action === 'edited')) {
                    return edit.text;
                }
                return clause.text;
            }).join('\n\n');

            await onSaveToCloud(editedClauses, fullEditedText);
            setSaveStatus('success');
        } catch (error) {
            console.error('Failed to save:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredClauses = showOnlyIssues
        ? clauses.filter(c => c.hasIssue)
        : clauses;

    const stats = {
        total: clauses.length,
        withIssues: clauses.filter(c => c.hasIssue).length,
        edited: Object.keys(editedClauses).length
    };

    return (
        <div className="contract-view">
            {/* Header */}
            <div className="contract-view-header">
                <h3>Contract Clauses</h3>
                <div className="contract-view-stats">
                    <span className="stat">{stats.total} clauses</span>
                    <span className="stat warning">{stats.withIssues} with issues</span>
                    {stats.edited > 0 && (
                        <span className="stat primary">{stats.edited} edited</span>
                    )}
                </div>
                <div className="contract-view-controls">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showOnlyIssues}
                            onChange={(e) => setShowOnlyIssues(e.target.checked)}
                        />
                        Show only issues
                    </label>
                </div>
            </div>

            {/* Clauses List */}
            <div className="clauses-list">
                {filteredClauses.length === 0 ? (
                    <div className="no-clauses">
                        {showOnlyIssues
                            ? 'No issues found in this contract! 🎉'
                            : 'No contract text available.'}
                    </div>
                ) : (
                    filteredClauses.map((clause, index) => (
                        <div
                            key={clause.id}
                            className={`clause-wrapper ${clause.hasIssue ? 'has-issue' : ''}`}
                        >
                            <div className="clause-number">{index + 1}</div>

                            {clause.hasIssue ? (
                                <div className="clause-with-issue">
                                    <div className="issue-badge">
                                        <span className={`risk-level ${clause.issue.risk_level?.toLowerCase()}`}>
                                            {clause.issue.risk_level}
                                        </span>
                                        <span className="issue-topic">{clause.issue.clause_topic}</span>
                                    </div>
                                    <ClauseEditor
                                        clause={clause.text}
                                        suggestedFix={clause.issue.suggested_fix}
                                        onAccept={(newText) => handleClauseEdit(clause.id, newText, 'accepted')}
                                        onDecline={() => handleClauseEdit(clause.id, clause.text, 'declined')}
                                        onManualEdit={(newText) => handleClauseEdit(clause.id, newText, 'edited')}
                                    />
                                </div>
                            ) : (
                                <Card variant="outlined" padding="sm" className="clause-card-simple">
                                    <p className="clause-text-simple" dir="auto">{clause.text}</p>
                                </Card>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Actions */}
            {stats.edited > 0 && (
                <div className="contract-view-footer">
                    <button
                        className="export-edited-btn"
                        onClick={() => onExportEdited?.(editedClauses)}
                    >
                        📥 Export Edited Contract
                    </button>
                    {onSaveToCloud && (
                        <button
                            className="save-cloud-btn"
                            onClick={handleSaveToCloud}
                            disabled={isSaving}
                        >
                            {isSaving ? '⏳ Saving...' : '☁️ Save to Cloud'}
                        </button>
                    )}
                    {saveStatus === 'success' && (
                        <span className="save-status success">✅ Saved!</span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="save-status error">❌ Save failed</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContractView;
