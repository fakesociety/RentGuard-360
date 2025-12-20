import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { processContractClauses, detectLanguage } from '../utils/contractTextProcessor';
import { consultClause } from '../services/api';
import { exportEditedContractWithSignatures } from '../services/ExportService';
import './ContractView.css';

/**
 * ContractView - Virtual PDF Contract Display
 */
const ContractView = ({
    contractText = '',
    backendClauses = [],
    issues = [],
    onClauseChange,
    onExportEdited,
    onSaveToCloud
}) => {
    const [editedClauses, setEditedClauses] = useState({});
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // Modal editing state
    const [selectedClause, setSelectedClause] = useState(null);
    const [editingText, setEditingText] = useState('');

    // AI Consultation state
    const [consultingClauseId, setConsultingClauseId] = useState(null);
    const [clauseExplanations, setClauseExplanations] = useState({});
    const [expandedExplanations, setExpandedExplanations] = useState({});
    const [consultError, setConsultError] = useState(null);

    // Scroll navigation state
    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(true); // Always show initially
    const [isAtBottom, setIsAtBottom] = useState(false);

    // Track scroll position - check both container and window
    useEffect(() => {
        const checkScroll = () => {
            const container = containerRef.current;
            if (!container) return;

            // Check if bottomRef is in viewport
            if (bottomRef.current) {
                const rect = bottomRef.current.getBoundingClientRect();
                const isVisible = rect.top <= window.innerHeight;
                setIsAtBottom(isVisible);
            }
        };

        // Listen to both window and container scroll
        window.addEventListener('scroll', checkScroll, true);

        // Initial check
        checkScroll();

        return () => window.removeEventListener('scroll', checkScroll, true);
    }, []);

    // Scroll functions
    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const scrollToTop = () => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Process clauses
    const clauses = useMemo(() => {
        let rawClauses = [];

        if (backendClauses && backendClauses.length > 0) {
            rawClauses = backendClauses.map(c => typeof c === 'string' ? c : String(c));
        } else if (contractText) {
            rawClauses = contractText
                .split(/\n\n+|\n(?=\d+\.\s)/)
                .filter(p => p.trim().length > 0);
        }

        const processedClauses = processContractClauses(rawClauses);

        return processedClauses.map((text, index) => {
            const clauseObj = {
                id: `clause-${index}`,
                text: text.trim(),
                hasIssue: false,
                issue: null,
                isEdited: !!editedClauses[`clause-${index}`]
            };

            const matchedIssue = issues.find(issue => {
                const issueText = issue.original_text?.toLowerCase() || '';
                const clauseTextLower = clauseObj.text.toLowerCase();
                return (
                    clauseTextLower.includes(issueText.slice(0, 50)) ||
                    issueText.includes(clauseTextLower.slice(0, 50))
                );
            });

            if (matchedIssue) {
                clauseObj.hasIssue = true;
                clauseObj.issue = matchedIssue;
            }

            return clauseObj;
        });
    }, [contractText, backendClauses, issues, editedClauses]);

    // Detect document language
    const documentLanguage = useMemo(() => {
        if (clauses.length === 0) return 'he';
        const sampleText = clauses.slice(0, 5).map(c => c.text).join(' ');
        return detectLanguage(sampleText);
    }, [clauses]);

    // Get current text for a clause
    const getClauseText = (clause) => {
        return editedClauses[clause.id]?.text || clause.text;
    };

    // Open popup editor
    const openEditor = (clause) => {
        setSelectedClause(clause);
        setEditingText(getClauseText(clause));
    };

    // Close popup editor
    const closeEditor = () => {
        setSelectedClause(null);
        setEditingText('');
    };

    // Save edit from popup
    const saveEdit = () => {
        if (selectedClause && editingText.trim()) {
            setEditedClauses(prev => ({
                ...prev,
                [selectedClause.id]: { text: editingText.trim(), action: 'edited' }
            }));
            onClauseChange?.(selectedClause.id, editingText.trim(), 'edited');
            setSaveStatus(null);
        }
        closeEditor();
    };

    // Apply suggested fix
    const applySuggestedFix = () => {
        if (selectedClause?.issue?.suggested_fix) {
            setEditingText(selectedClause.issue.suggested_fix);
        }
    };

    // Consult AI for clause explanation
    const handleConsultClause = async (clause, e) => {
        e.stopPropagation();

        if (clauseExplanations[clause.id]) {
            setExpandedExplanations(prev => ({
                ...prev,
                [clause.id]: !prev[clause.id]
            }));
            return;
        }

        setConsultingClauseId(clause.id);
        setConsultError(null);

        try {
            const response = await consultClause(null, getClauseText(clause));
            setClauseExplanations(prev => ({
                ...prev,
                [clause.id]: response.explanation
            }));
            setExpandedExplanations(prev => ({
                ...prev,
                [clause.id]: true
            }));
        } catch (error) {
            console.error('Consult clause error:', error);
            setConsultError('שגיאה בקבלת הסבר. נסה שוב.');
        } finally {
            setConsultingClauseId(null);
        }
    };

    // Toggle explanation visibility
    const toggleExplanation = (clauseId) => {
        setExpandedExplanations(prev => ({
            ...prev,
            [clauseId]: !prev[clauseId]
        }));
    };

    // Export contract with signatures
    const handleExport = async () => {
        const clauseTexts = clauses.map(c => getClauseText(c));
        await exportEditedContractWithSignatures(clauseTexts, editedClauses, 'חוזה_שכירות');
    };

    // Save to cloud
    const handleSaveToCloud = async () => {
        if (!onSaveToCloud) return;
        setIsSaving(true);
        setSaveStatus(null);

        try {
            const fullEditedText = clauses.map(c => getClauseText(c)).join('\n\n');
            await onSaveToCloud(editedClauses, fullEditedText);
            setSaveStatus('success');
        } catch (error) {
            console.error('Failed to save:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Filter clauses
    const filteredClauses = showOnlyIssues
        ? clauses.filter(c => c.hasIssue)
        : clauses;

    // Stats
    const stats = {
        total: clauses.length,
        withIssues: clauses.filter(c => c.hasIssue).length,
        edited: Object.keys(editedClauses).length
    };

    // Inline styles for dark mode fix
    const paperStyle = {
        background: '#ffffff',
        color: '#1a1a1a',
    };

    const textStyle = {
        color: '#1a1a1a',
    };

    return (
        <div className="virtual-pdf-container" ref={containerRef}>
            <div className="virtual-pdf-page" style={paperStyle}>
                {/* ===== HEBREW HEADER ===== */}
                <header className="contract-header-formal">
                    <h1 className="contract-main-title" style={textStyle}>חוזה שכירות בלתי מוגנת</h1>
                    <p className="contract-subtitle" style={{ color: '#555' }}>נערך ונחתם ביום ________________</p>
                </header>

                {/* Toolbar */}
                <div className="contract-toolbar no-print">
                    <div className="toolbar-left">
                        <label className="filter-toggle">
                            <input
                                type="checkbox"
                                checked={showOnlyIssues}
                                onChange={(e) => setShowOnlyIssues(e.target.checked)}
                            />
                            הצג רק סעיפים בעייתיים
                        </label>
                    </div>
                    <div className="toolbar-stats">
                        <span className="stat-badge total">{stats.total} סעיפים</span>
                        {stats.withIssues > 0 && (
                            <span className="stat-badge issues">⚠️ {stats.withIssues} בעיות</span>
                        )}
                        {stats.edited > 0 && (
                            <span className="stat-badge edited">✏️ {stats.edited} נערכו</span>
                        )}
                    </div>
                </div>

                {/* ===== CLAUSES ===== */}
                <div className="clauses-container">
                    {filteredClauses.length === 0 ? (
                        <div className="no-clauses">
                            {showOnlyIssues ? '🎉 לא נמצאו בעיות!' : 'לא נמצא טקסט.'}
                        </div>
                    ) : (
                        filteredClauses.map((clause) => (
                            <div key={clause.id} className="clause-wrapper">
                                {/* Issue indicator */}
                                {clause.hasIssue && clause.issue && (
                                    <div className={`issue-marker ${clause.issue.risk_level?.toLowerCase()}`}>
                                        {clause.issue.risk_level === 'High' && '🔴'}
                                        {clause.issue.risk_level === 'Medium' && '🟡'}
                                        {clause.issue.risk_level === 'Low' && '🟢'}
                                        <span className="issue-topic">{clause.issue.clause_topic}</span>
                                    </div>
                                )}

                                {/* Clause content */}
                                <div
                                    className={`clause-item ${clause.hasIssue ? 'has-issue' : ''} ${clause.isEdited ? 'is-edited' : ''}`}
                                    onClick={() => openEditor(clause)}
                                >
                                    <div className="clause-view-mode">
                                        <p className="clause-text" dir="rtl" style={textStyle}>
                                            {getClauseText(clause)}
                                        </p>

                                        {/* Consult AI Button - hide if already has answer */}
                                        {!clauseExplanations[clause.id] && (
                                            <button
                                                className="consult-btn no-print"
                                                onClick={(e) => handleConsultClause(clause, e)}
                                                disabled={consultingClauseId === clause.id}
                                                title="קבל הסבר על הסעיף"
                                            >
                                                {consultingClauseId === clause.id ? '⏳' : '💡'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* AI Explanation Box - Collapsible */}
                                {clauseExplanations[clause.id] && (
                                    <div className={`ai-explanation no-print ${expandedExplanations[clause.id] ? 'expanded' : 'minimized'}`}>
                                        <div
                                            className="explanation-header"
                                            onClick={() => toggleExplanation(clause.id)}
                                        >
                                            <span>💡 הסבר AI</span>
                                            <button className="toggle-explanation">
                                                {expandedExplanations[clause.id] ? '▼' : '▶'}
                                            </button>
                                        </div>
                                        {expandedExplanations[clause.id] && (
                                            <div className="explanation-content" dir="rtl">
                                                {clauseExplanations[clause.id]}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Suggested Fix for issues */}
                                {clause.hasIssue && clause.issue?.suggested_fix && (
                                    <div className="suggested-fix no-print">
                                        <strong>💡 הצעה לתיקון:</strong>
                                        <p>{clause.issue.suggested_fix}</p>
                                        <button
                                            className="apply-fix-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditedClauses(prev => ({
                                                    ...prev,
                                                    [clause.id]: { text: clause.issue.suggested_fix, action: 'accepted' }
                                                }));
                                            }}
                                        >
                                            ✓ החל תיקון
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* ===== SIGNATURE FOOTER ===== */}
                <footer className="contract-footer-signature">
                    <div className="signature-section">
                        <h3 style={textStyle}>חתימות</h3>
                        <div className="signatures">
                            <div className="signature-block">
                                <div className="signature-line"></div>
                                <p style={textStyle}>המשכיר</p>
                                <p className="signature-placeholder">שם: ________________</p>
                                <p className="signature-placeholder">ת.ז.: ________________</p>
                            </div>
                            <div className="signature-block">
                                <div className="signature-line"></div>
                                <p style={textStyle}>השוכר</p>
                                <p className="signature-placeholder">שם: ________________</p>
                                <p className="signature-placeholder">ת.ז.: ________________</p>
                            </div>
                        </div>
                        <p className="signature-date" style={textStyle}>תאריך: ________________</p>
                    </div>
                </footer>

                {/* ===== EXPORT BUTTON ===== */}
                <div className="export-section no-print">
                    <button className="export-btn-main" onClick={handleExport}>
                        📝 ייצוא ל-Word
                    </button>
                    {onSaveToCloud && (
                        <button
                            className="save-btn-main"
                            onClick={handleSaveToCloud}
                            disabled={isSaving}
                        >
                            {isSaving ? '⏳ שומר...' : '☁️ שמור בענן'}
                        </button>
                    )}
                    {saveStatus === 'success' && <span className="save-status success">✅ נשמר!</span>}
                    {saveStatus === 'error' && <span className="save-status error">❌ שגיאה</span>}
                </div>

                {/* Bottom anchor for scroll */}
                <div ref={bottomRef}></div>
            </div>

            {/* Floating Scroll Button - Always visible */}
            <button
                className={`scroll-nav-btn no-print ${isAtBottom ? 'at-bottom' : ''}`}
                onClick={isAtBottom ? scrollToTop : scrollToBottom}
                title={isAtBottom ? 'גלול למעלה' : 'גלול לחתימות'}
            >
                {isAtBottom ? '⬆️' : '⬇️'}
                <span className="scroll-btn-label">
                    {isAtBottom ? 'למעלה' : 'לחתימות'}
                </span>
            </button>
            {/* ===== HEBREW POPUP EDITOR (Same Style as Contract) ===== */}
            {selectedClause && (
                <div
                    className="clause-editor-modal"
                    onClick={closeEditor}
                >
                    <div
                        className="clause-popup-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            color: '#1a1a1a',
                            fontFamily: "'David Libre', 'Noto Serif Hebrew', 'Times New Roman', Georgia, serif"
                        }}
                    >
                        <div className="popup-header">
                            <h3>✏️ עריכת סעיף</h3>
                            <button
                                className="popup-close"
                                onClick={closeEditor}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="popup-body" dir="rtl">
                            {/* Original clause */}
                            <div className="popup-section">
                                <label>סעיף מקורי:</label>
                                <div className="popup-original-text">
                                    {selectedClause.text}
                                </div>
                            </div>

                            {/* Suggested fix if available */}
                            {selectedClause.issue?.suggested_fix && (
                                <div className="popup-section suggested">
                                    <label>הצעת תיקון AI:</label>
                                    <div className="popup-suggested-text">
                                        {selectedClause.issue.suggested_fix}
                                    </div>
                                    <button
                                        className="popup-apply-btn"
                                        onClick={applySuggestedFix}
                                    >
                                        ✓ החל הצעה
                                    </button>
                                </div>
                            )}

                            {/* Edit textarea */}
                            <div className="popup-section">
                                <label>עריכה:</label>
                                <textarea
                                    className="popup-textarea"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    dir="rtl"
                                    rows={6}
                                    placeholder="ערוך את הסעיף כאן..."
                                />
                            </div>
                        </div>

                        <div className="popup-footer">
                            <button className="popup-save-btn" onClick={saveEdit}>
                                ✓ שמור שינויים
                            </button>
                            <button className="popup-cancel-btn" onClick={closeEditor}>
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {consultError && (
                <div className="error-toast no-print">
                    {consultError}
                    <button onClick={() => setConsultError(null)}>✕</button>
                </div>
            )}
        </div>
    );
};

export default ContractView;
