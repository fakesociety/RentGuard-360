/**
 * ============================================
 *  ContractView
 *  Virtual PDF Contract Display & Editor
 * ============================================
 * 
 * STRUCTURE:
 * - Contract header (title, date)
 * - Toolbar (filter, stats)
 * - Clauses list with issue markers
 * - Popup clause editor
 * - Signature footer
 * - Export section
 * 
 * FEATURES:
 * - View all clauses with issue highlighting
 * - Click-to-edit with popup editor
 * - Apply AI suggested fixes
 * - AI clause consultation (explain any clause)
 * - Auto-save edits to localStorage + cloud
 * - Export edited contract to Word
 * - Revert edits (single or all)
 * 
 * DEPENDENCIES:
 * - api.js: consultClause
 * - ExportService.js: exportEditedContractWithSignatures
 * - contractTextProcessor: clause parsing
 * - RecommendationCard: suggestion display
 * 
 * ============================================
 */
import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { processContractClauses } from '../utils/contractTextProcessor';
import { consultClause } from '../services/api';
import { exportEditedContractWithSignatures } from '../services/ExportService';
import RecommendationCard from './RecommendationCard';
import './ContractView.css';

const ContractView = forwardRef(({
    contractText = '',
    backendClauses = [],
    issues = [],
    contractId = null,  // NEW: for localStorage persistence
    onClauseChange,
    onSaveToCloud,
    onEditStateChange,
}, ref) => {
    const [editedClauses, setEditedClauses] = useState({});
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // Modal editing state
    const [selectedClause, setSelectedClause] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [confirmRevertId, setConfirmRevertId] = useState(null); // ID of clause to revert
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false); // State for Clear All modal

    // AI Consultation state
    const [consultingClauseId, setConsultingClauseId] = useState(null);
    const [clauseExplanations, setClauseExplanations] = useState({});
    const [expandedExplanations, setExpandedExplanations] = useState({});
    const [consultError, setConsultError] = useState(null);

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

    // Get current text for a clause (with clause number preserved)
    const getClauseText = useCallback((clause) => {
        const edit = editedClauses[clause.id];
        if (edit?.text) {
            // Try to find original clause number from multiple sources
            let originalNumber = edit.originalNumber;
            if (!originalNumber) {
                // Try from clause.text
                originalNumber = clause.text?.match(/^(\d+\.)\s*/)?.[1];
            }
            if (!originalNumber && clause.issue?.original_text) {
                // Try from issue's original_text
                originalNumber = clause.issue.original_text?.match(/^(\d+\.)\s*/)?.[1];
            }

            if (originalNumber && !edit.text.match(/^\d+\.\s*/)) {
                // Add the number only if the edit text doesn't already have one
                return `${originalNumber} ${edit.text}`;
            }
            return edit.text;
        }
        return clause.text;
    }, [editedClauses]);

    // Scroll navigation state
    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(false);

    // Auto-save refs
    const isFirstRender = useRef(true);
    const saveTimeoutRef = useRef(null);
    const saveStatusTimeoutRef = useRef(null);
    const skipNextCloudSaveRef = useRef(false);
    const lastCloudSaveSignatureRef = useRef('');
    const lastReportedEditStateRef = useRef('');

    // Load saved edits from localStorage on mount
    useEffect(() => {
        if (!contractId) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setEditedClauses(parsed);
                // Hydrated edits from localStorage should not immediately trigger cloud save.
                skipNextCloudSaveRef.current = true;
                console.log(`Loaded ${Object.keys(parsed).length} saved edits for contract`);
            }
        } catch (error) {
            console.warn('Failed to load saved edits:', error);
        }
    }, [contractId]);

    // Auto-save edits to localStorage when changed
    useEffect(() => {
        if (!contractId || Object.keys(editedClauses).length === 0) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(editedClauses));
            console.log(`Auto-saved ${Object.keys(editedClauses).length} edits to localStorage`);
        } catch (error) {
            console.warn('Failed to save edits:', error);
        }
    }, [contractId, editedClauses]);

    // Auto-save to Cloud (Debounced)
    useEffect(() => {
        if (!onSaveToCloud || !contractId) return;

        // Skip initial render to avoid saving on load
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Skip one cycle after loading existing edits from localStorage.
        if (skipNextCloudSaveRef.current) {
            skipNextCloudSaveRef.current = false;
            return;
        }

        // Construct full text and a signature to avoid repeated saves of the same data.
        const fullEditedText = clauses.map(c => getClauseText(c)).join('\n\n');
        const saveSignature = JSON.stringify({
            contractId,
            editedClauses,
            fullEditedText,
        });

        if (saveSignature === lastCloudSaveSignatureRef.current) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setSaveStatus('saving');

        // Set new timeout (2 seconds debounce)
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await onSaveToCloud(editedClauses, fullEditedText);
                lastCloudSaveSignatureRef.current = saveSignature;
                setSaveStatus('success');

                // Clear success message after 3 seconds
                if (saveStatusTimeoutRef.current) {
                    clearTimeout(saveStatusTimeoutRef.current);
                }
                saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus(null), 3000);
            } catch (error) {
                console.error('Auto-save failed:', error);
                setSaveStatus('error');
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [editedClauses, contractId, onSaveToCloud, clauses, getClauseText]); // Dependencies include content

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (saveStatusTimeoutRef.current) {
                clearTimeout(saveStatusTimeoutRef.current);
            }
        };
    }, []);

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

    // Helper: Extract clause number from text (e.g., "1." from "1. הטקסט...")
    const extractClauseNumber = (text) => {
        const match = text?.match(/^(\d+\.)\s*/);
        return match ? match[1] : null;
    };

    // Request revert (open confirmation)
    const requestRevert = (clauseId, e) => {
        if (e) e.stopPropagation();
        setConfirmRevertId(clauseId);
    };

    // Confirm revert action
    const confirmRevert = () => {
        if (confirmRevertId) {
            const newEdited = { ...editedClauses };
            delete newEdited[confirmRevertId];
            setEditedClauses(newEdited);

            // Close editor if open for this clause
            if (selectedClause?.id === confirmRevertId) {
                closeEditor();
            }
            setConfirmRevertId(null);
        }
    };

    // Cancel revert
    const cancelRevert = () => {
        setConfirmRevertId(null);
    };

    // Save edit from popup
    const saveEdit = () => {
        if (selectedClause && editingText.trim()) {
            // Extract clause number from original text (try multiple sources)
            let originalNumber = extractClauseNumber(selectedClause.text);

            if (!originalNumber && selectedClause.issue?.original_text) {
                originalNumber = extractClauseNumber(selectedClause.issue.original_text);
            }

            setEditedClauses(prev => ({
                ...prev,
                [selectedClause.id]: {
                    text: editingText.trim(),
                    action: 'edited',
                    originalNumber: originalNumber  // Save the original clause number
                }
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
    const handleExport = useCallback(async () => {
        const clauseTexts = clauses.map(c => getClauseText(c));
        await exportEditedContractWithSignatures(clauseTexts, editedClauses, 'חוזה_שכירות_ערוך');
    }, [clauses, getClauseText, editedClauses]);

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

    useEffect(() => {
        if (!onEditStateChange) return;

        const next = {
            editedCount: Object.keys(editedClauses).length,
            saveStatus,
        };
        const signature = JSON.stringify(next);
        if (signature === lastReportedEditStateRef.current) {
            return;
        }

        lastReportedEditStateRef.current = signature;
        onEditStateChange(next);
    }, [editedClauses, saveStatus, onEditStateChange]);

    useImperativeHandle(ref, () => ({
        handleExport,
        requestClearAll: () => setShowClearAllConfirm(true),
    }), [handleExport]);

    return (
        <div
            className="contract-scroll-content"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
        <div className="virtual-pdf-container" ref={containerRef} style={{ width: '100%' }}>
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

                                        <div className="clause-actions no-print">
                                            {/* Consult AI Button - hide if already has answer */}
                                            {!clauseExplanations[clause.id] && (
                                                <button
                                                    className="action-btn consult-btn"
                                                    onClick={(e) => handleConsultClause(clause, e)}
                                                    disabled={consultingClauseId === clause.id}
                                                    title="קבל הסבר על הסעיף"
                                                >
                                                    {consultingClauseId === clause.id ? '⏳' : '💡'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit Hint Overlay */}
                                    <div className="clause-hover-hint no-print">
                                        ✎ עריכה
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

                                {/* Suggested Fix for issues - Modern Design */}
                                {clause.hasIssue && clause.issue?.suggested_fix && (
                                    <RecommendationCard
                                        title="הצעה לתיקון"
                                        suggestion={clause.issue.suggested_fix}
                                        isApplied={!!editedClauses[clause.id]}
                                        onApply={() => {
                                            setEditedClauses(prev => ({
                                                ...prev,
                                                [clause.id]: { text: clause.issue.suggested_fix, action: 'accepted' }
                                            }));
                                        }}
                                        onRevert={(e) => requestRevert(clause.id, e)}
                                    />
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
        </div>

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

                            {/* Suggested fix if available - Modern Style */}
                            {selectedClause.issue?.suggested_fix && (
                                <div className="popup-section popup-suggested-modern">
                                    <div className="popup-suggested-header">
                                        <span className="popup-suggested-icon">💡</span>
                                        <label>הצעת תיקון AI</label>
                                    </div>
                                    <div className="popup-suggested-text">
                                        {selectedClause.issue.suggested_fix}
                                    </div>
                                    <button
                                        className="popup-apply-btn-modern"
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
                                ✓ סיום עריכה
                            </button>

                            {/* Revert Button in Popup */}
                            {selectedClause.isEdited && (
                                <button
                                    className="popup-revert-btn"
                                    onClick={(e) => requestRevert(selectedClause.id, e)}
                                >
                                    ↩️ חזור למקור
                                </button>
                            )}

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

            {/* Custom Revert Confirmation Modal */}
            {confirmRevertId && (
                <div className="clause-editor-modal" onClick={cancelRevert}>
                    <div
                        className="clause-popup-content"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '400px', padding: '0' }}
                    >
                        <div className="popup-header" style={{ borderBottom: 'none', padding: '24px 24px 0' }}>
                            <h3 style={{ fontSize: '1.125rem' }}>⚠️ אישור ביטול</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '16px 24px 32px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#555' }}>
                                האם אתה בטוח שברצונך לבטל את העריכה ולחזור לטקסט המקורי?
                            </p>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', background: '#f9fafb' }}>
                            <button
                                className="popup-revert-btn"
                                onClick={confirmRevert}
                                style={{ width: 'auto', minWidth: '120px' }}
                            >
                                כן, בטל עריכה
                            </button>
                            <button
                                className="popup-cancel-btn"
                                onClick={cancelRevert}
                                style={{ width: 'auto', minWidth: '120px' }}
                            >
                                לא, השאר
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Edits Confirmation Modal */}
            {showClearAllConfirm && (
                <div className="clause-editor-modal" onClick={() => setShowClearAllConfirm(false)}>
                    <div
                        className="clause-popup-content"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '400px', padding: '0' }}
                    >
                        <div className="popup-header" style={{ borderBottom: 'none', padding: '24px 24px 0' }}>
                            <h3 style={{ fontSize: '1.125rem' }}>⚠️ מחיקת כל העריכות</h3>
                        </div>
                        <div className="popup-body" style={{ padding: '16px 24px 32px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#555' }}>
                                האם אתה בטוח שברצונך למחוק את כל העריכות שביצעת בחוזה זה?
                                <br />
                                <span style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '8px', display: 'block' }}>
                                    פעולה זו אינה הפיכה.
                                </span>
                            </p>
                        </div>
                        <div className="popup-footer" style={{ justifyContent: 'center', background: '#f9fafb' }}>
                            <button
                                className="popup-revert-btn"
                                onClick={() => {
                                    setEditedClauses({});
                                    if (contractId) {
                                        localStorage.removeItem(`rentguard_edits_${contractId}`);
                                    }
                                    setSaveStatus(null);
                                    setShowClearAllConfirm(false);
                                }}
                                style={{ width: 'auto', minWidth: '120px' }}
                            >
                                כן, מחק הכל
                            </button>
                            <button
                                className="popup-cancel-btn"
                                onClick={() => setShowClearAllConfirm(false)}
                                style={{ width: 'auto', minWidth: '120px' }}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

ContractView.displayName = 'ContractView';

export default ContractView;
