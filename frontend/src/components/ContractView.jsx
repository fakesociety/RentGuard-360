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
import { 
    ArrowDown, 
    ArrowUp,
    AlertTriangle,
    Info,
    CheckCircle2,
    Loader2,
    Sparkles,
    Pen,
    Edit3,
    X,
    Check,
    Undo2,
    Maximize2,
    Minimize2,
    ChevronDown,
    ChevronLeft,
    PartyPopper
} from 'lucide-react';
import { processContractClauses } from '../utils/contractTextProcessor';
import { consultClause } from '../services/api';
import { exportEditedContractWithSignatures, exportEditedContractWithSignaturesBlob } from '../services/ExportService';
import { useLanguage } from '../contexts/LanguageContext';
import RecommendationCard from './RecommendationCard';
import './ContractView.css';

const ContractView = forwardRef(({
    contractText = '',
    backendClauses = [],
    issues = [],
    readOnly = false,
    initialEditedClauses = {},
    contractId = null,
    onClauseChange,
    onSaveToCloud,
    onEditStateChange,
}, ref) => {
    const { t, isRTL } = useLanguage();
    const [editedClauses, setEditedClauses] = useState(() => initialEditedClauses || {});
    const editedClausesRef = useRef(initialEditedClauses || {});
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // Minimize state for the entire contract view
    const [isMinimized, setIsMinimized] = useState(false);

    // Modal editing state
    const [selectedClause, setSelectedClause] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [confirmRevertId, setConfirmRevertId] = useState(null);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

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

    const getClauseTextFromEdits = useCallback((clause, editsMap) => {
        const edit = (editsMap || {})[clause.id];
        if (edit?.text) {
            let originalNumber = edit.originalNumber;
            if (!originalNumber) {
                originalNumber = clause.text?.match(/^(\d+\.)\s*/)?.[1];
            }
            if (!originalNumber && clause.issue?.original_text) {
                originalNumber = clause.issue.original_text?.match(/^(\d+\.)\s*/)?.[1];
            }

            if (originalNumber && !edit.text.match(/^\d+\.\s*/)) {
                return `${originalNumber} ${edit.text}`;
            }
            return edit.text;
        }
        return clause.text;
    }, []);

    const getClauseText = useCallback((clause) => {
        return getClauseTextFromEdits(clause, editedClauses);
    }, [editedClauses, getClauseTextFromEdits]);

    const updateEditedClauses = useCallback((updater) => {
        setEditedClauses(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            editedClausesRef.current = next;
            return next;
        });
    }, []);

    useEffect(() => {
        if (!readOnly) return;
        const normalized = initialEditedClauses || {};
        editedClausesRef.current = normalized;
        setEditedClauses(normalized);
    }, [readOnly, initialEditedClauses]);

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

    // Load saved edits from localStorage
    useEffect(() => {
        if (readOnly) return;
        if (!contractId) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                editedClausesRef.current = parsed;
                setEditedClauses(parsed);
                skipNextCloudSaveRef.current = true;
            }
        } catch (error) {
            console.warn('Failed to load saved edits:', error);
        }
    }, [contractId, readOnly]);

    // Auto-save to localStorage
    useEffect(() => {
        if (readOnly) return;
        if (!contractId || Object.keys(editedClauses).length === 0) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(editedClauses));
        } catch (error) {
            console.warn('Failed to save edits:', error);
        }
    }, [contractId, editedClauses, readOnly]);

    // Auto-save to Cloud
    useEffect(() => {
        if (readOnly) return;
        if (!onSaveToCloud || !contractId) return;

        // Skip the very first render cycle (component mount).
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Seed the save signature with the current state so that subsequent
            // runs only trigger a save when actual edits happen.
            const initialText = clauses.map(c => getClauseText(c)).join('\n\n');
            lastCloudSaveSignatureRef.current = JSON.stringify({
                contractId,
                editedClauses,
                fullEditedText: initialText,
            });
            return;
        }

        if (skipNextCloudSaveRef.current) {
            skipNextCloudSaveRef.current = false;
            // Also update the signature so the next run won't see a delta.
            const skippedText = clauses.map(c => getClauseText(c)).join('\n\n');
            lastCloudSaveSignatureRef.current = JSON.stringify({
                contractId,
                editedClauses,
                fullEditedText: skippedText,
            });
            return;
        }

        // Nothing to save when there are no edits.
        if (Object.keys(editedClauses).length === 0) return;

        const fullEditedText = clauses.map(c => getClauseText(c)).join('\n\n');
        const saveSignature = JSON.stringify({
            contractId,
            editedClauses,
            fullEditedText,
        });

        if (saveSignature === lastCloudSaveSignatureRef.current) {
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setSaveStatus('saving');

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await onSaveToCloud(editedClauses, fullEditedText);
                lastCloudSaveSignatureRef.current = saveSignature;
                setSaveStatus('success');

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
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [editedClauses, contractId, onSaveToCloud, clauses, getClauseText, readOnly]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
        };
    }, []);

    // Track scroll
    useEffect(() => {
        const checkScroll = () => {
            const container = containerRef.current;
            if (!container) return;
            if (bottomRef.current) {
                const rect = bottomRef.current.getBoundingClientRect();
                const isVisible = rect.top <= window.innerHeight;
                setIsAtBottom(isVisible);
            }
        };

        window.addEventListener('scroll', checkScroll, true);
        checkScroll();
        return () => window.removeEventListener('scroll', checkScroll, true);
    }, []);

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const scrollToTop = () => containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const openEditor = (clause) => {
        if (readOnly) return;
        setSelectedClause(clause);
        setEditingText(getClauseText(clause));
    };

    const closeEditor = () => {
        setSelectedClause(null);
        setEditingText('');
    };

    const extractClauseNumber = (text) => {
        const match = text?.match(/^(\d+\.)\s*/);
        return match ? match[1] : null;
    };

    const requestRevert = (clauseId, e) => {
        if (e) e.stopPropagation();
        setConfirmRevertId(clauseId);
    };

    const confirmRevert = () => {
        if (confirmRevertId) {
            const newEdited = { ...editedClauses };
            delete newEdited[confirmRevertId];
            updateEditedClauses(newEdited);

            if (selectedClause?.id === confirmRevertId) {
                closeEditor();
            }
            setConfirmRevertId(null);
        }
    };

    const cancelRevert = () => setConfirmRevertId(null);

    const saveEdit = () => {
        if (selectedClause && editingText.trim()) {
            let originalNumber = extractClauseNumber(selectedClause.text);
            if (!originalNumber && selectedClause.issue?.original_text) {
                originalNumber = extractClauseNumber(selectedClause.issue.original_text);
            }

            updateEditedClauses(prev => ({
                ...prev,
                [selectedClause.id]: {
                    text: editingText.trim(),
                    action: 'edited',
                    originalNumber: originalNumber 
                }
            }));
            onClauseChange?.(selectedClause.id, editingText.trim(), 'edited');
            setSaveStatus(null);
        }
        closeEditor();
    };

    const applySuggestedFix = () => {
        if (selectedClause?.issue?.suggested_fix) {
            setEditingText(selectedClause.issue.suggested_fix);
        }
    };

    const handleConsultClause = async (clause, e) => {
        if (readOnly) return;
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
            setConsultError(t('contractView.consultError'));
        } finally {
            setConsultingClauseId(null);
        }
    };

    const toggleExplanation = (clauseId) => {
        setExpandedExplanations(prev => ({
            ...prev,
            [clauseId]: !prev[clauseId]
        }));
    };

    const handleExport = useCallback(async () => {
        const currentEdits = editedClausesRef.current || {};
        const clauseTexts = clauses.map(c => getClauseTextFromEdits(c, currentEdits));
        await exportEditedContractWithSignatures(clauseTexts, currentEdits, t('contractView.editedContractFileName'));
    }, [clauses, getClauseTextFromEdits, t]);

    const handleGetDocxBlob = useCallback(async () => {
        const currentEdits = editedClausesRef.current || {};
        const clauseTexts = clauses.map(c => getClauseTextFromEdits(c, currentEdits));
        return await exportEditedContractWithSignaturesBlob(clauseTexts, currentEdits, t('contractView.editedContractFileName'));
    }, [clauses, getClauseTextFromEdits, t]);

    const getCurrentEditedPayload = useCallback(() => {
        const currentEdits = editedClausesRef.current || {};
        const fullEditedText = clauses.map(c => getClauseTextFromEdits(c, currentEdits)).join('\n\n');
        return {
            editedClauses: currentEdits,
            fullEditedText,
        };
    }, [clauses, getClauseTextFromEdits]);

    const filteredClauses = showOnlyIssues
        ? clauses.filter(c => c.hasIssue)
        : clauses;

    const stats = {
        total: clauses.length,
        withIssues: clauses.filter(c => c.hasIssue).length,
        edited: Object.keys(editedClauses).length
    };

    useEffect(() => {
        if (!onEditStateChange) return;

        const next = {
            editedCount: Object.keys(editedClauses).length,
            saveStatus,
        };
        const signature = JSON.stringify(next);
        if (signature === lastReportedEditStateRef.current) return;

        lastReportedEditStateRef.current = signature;
        onEditStateChange(next);
    }, [editedClauses, saveStatus, onEditStateChange]);

    useImperativeHandle(ref, () => ({
        handleExport,
        handleGetDocxBlob,
        getCurrentEditedPayload,
        requestClearAll: () => setShowClearAllConfirm(true),
    }), [handleExport, handleGetDocxBlob, getCurrentEditedPayload]);

    const renderRiskIcon = (level) => {
        switch (level) {
            case 'High': return <AlertTriangle size={16} strokeWidth={2.5} />;
            case 'Medium': return <Info size={16} strokeWidth={2.5} />;
            case 'Low': return <CheckCircle2 size={16} strokeWidth={2.5} />;
            default: return <Info size={16} strokeWidth={2.5} />;
        }
    };

return (
        <div className="contract-scroll-content">
            <div className={`virtual-pdf-container ${isMinimized ? 'minimized' : ''}`} ref={containerRef}>
                <div className="virtual-pdf-page">
                    
                    {/* ===== MINIMIZE / MAXIMIZE CONTROLS ===== */}
                    <div className="pdf-header-actions no-print">
                        <button 
                            className="minimize-pdf-btn" 
                            onClick={() => setIsMinimized(!isMinimized)}
                            title={isMinimized ? t('contractView.expand') : t('contractView.collapse')}
                        >
                            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                            <span>{isMinimized ? t('contractView.expand') : t('contractView.collapse')}</span>
                        </button>
                    </div>

                    {/* ===== HEBREW HEADER ===== */}
                    <header className="contract-header-formal">
                        <h1 className="contract-main-title">{t('contractView.contractTitle')}</h1>
                        <p className="contract-subtitle">{t('contractView.contractSubtitle')}</p>
                    </header>

                    {/* Show content only if NOT minimized */}
                    {!isMinimized && (
                        <>
                            {/* Toolbar */}
                            <div className="contract-toolbar no-print">
                                <div className="toolbar-left">
                                    {!readOnly && (
                                        <label className="filter-toggle">
                                            <input
                                                type="checkbox"
                                                checked={showOnlyIssues}
                                                onChange={(e) => setShowOnlyIssues(e.target.checked)}
                                            />
                                            {t('contractView.showOnlyProblemClauses')}
                                        </label>
                                    )}
                                </div>
                                <div className="toolbar-stats">
                                    <span className="stat-badge total">{stats.total} {t('contractView.clausesCountSuffix')}</span>
                                    {stats.withIssues > 0 && (
                                        <span className="stat-badge issues">
                                            <AlertTriangle size={14} /> {stats.withIssues} {t('contractView.issuesCountSuffix')}
                                        </span>
                                    )}
                                    {stats.edited > 0 && (
                                        <span className="stat-badge edited">
                                            <Edit3 size={14} /> {stats.edited} {t('contractView.editedCountSuffix')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ===== CLAUSES ===== */}
                            <div className="clauses-container">
                                {filteredClauses.length === 0 ? (
                                    <div className="no-clauses">
                                        {showOnlyIssues ? (
                                            <div className="no-issues-message">
                                                <PartyPopper size={20} /> {t('contractView.noIssuesFound')}
                                            </div>
                                        ) : t('contractView.noTextFound')}
                                    </div>
                                ) : (
                                    filteredClauses.map((clause) => (
                                        <div key={clause.id} className="clause-wrapper">
                                            {/* Issue indicator */}
                                            {clause.hasIssue && clause.issue && (
                                                <div className={`issue-marker ${clause.issue.risk_level?.toLowerCase()}`}>
                                                    {renderRiskIcon(clause.issue.risk_level)}
                                                    <span className="issue-topic">{clause.issue.clause_topic}</span>
                                                </div>
                                            )}

                                            {/* Clause content */}
                                            <div
                                                className={`clause-item ${clause.hasIssue ? 'has-issue' : ''} ${clause.isEdited ? 'is-edited' : ''} ${readOnly ? 'read-only' : ''}`}
                                                onClick={readOnly ? undefined : () => openEditor(clause)}
                                            >
                                                <div className="clause-view-mode">
                                                    <p className="clause-text" dir="rtl">
                                                        {getClauseText(clause)}
                                                    </p>

                                                    {!readOnly && (
                                                        <div className="clause-actions no-print">
                                                            {/* Consult AI Button */}
                                                            {!clauseExplanations[clause.id] && (
                                                                <button
                                                                    className="action-btn consult-btn"
                                                                    onClick={(e) => handleConsultClause(clause, e)}
                                                                    disabled={consultingClauseId === clause.id}
                                                                    title={t('contractView.getClauseExplanation')}
                                                                >
                                                                    {consultingClauseId === clause.id 
                                                                        ? <Loader2 className="spin" size={16} /> 
                                                                        : <Sparkles size={16} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Edit Hint Overlay */}
                                                {!readOnly && (
                                                    <div className="clause-hover-hint no-print">
                                                        <Pen size={14} /> {t('contractView.edit')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Explanation Box - Collapsible */}
                                            {clauseExplanations[clause.id] && (
                                                <div className={`ai-explanation no-print ${expandedExplanations[clause.id] ? 'expanded' : 'minimized'}`}>
                                                    <div
                                                        className="explanation-header"
                                                        onClick={() => toggleExplanation(clause.id)}
                                                    >
                                                        <span className="explanation-title">
                                                            <Sparkles size={16} /> {t('contractView.aiExplanation')}
                                                        </span>
                                                        <button className="toggle-explanation">
                                                            {expandedExplanations[clause.id] ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                                                        </button>
                                                    </div>
                                                    {expandedExplanations[clause.id] && (
                                                        <div className="explanation-content" dir="rtl">
                                                            {clauseExplanations[clause.id]}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Suggested Fix */}
                                            {!readOnly && clause.hasIssue && clause.issue?.suggested_fix && (
                                                <RecommendationCard
                                                    title={t('contractView.fixSuggestion')}
                                                    suggestion={clause.issue.suggested_fix}
                                                    isApplied={!!editedClauses[clause.id]}
                                                    onApply={() => {
                                                        updateEditedClauses(prev => ({
                                                            ...prev,
                                                            [clause.id]: { text: clause.issue.suggested_fix, action: 'accepted' }
                                                        }));
                                                        onClauseChange?.(clause.id, clause.issue.suggested_fix, 'accepted');
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
                                    <h3>{t('contractView.signaturesTitle')}</h3>
                                    <div className="signatures">
                                        <div className="signature-block">
                                            <div className="signature-line"></div>
                                            <p>{t('contractView.landlord')}</p>
                                            <p className="signature-placeholder">{t('contractView.namePlaceholder')}</p>
                                            <p className="signature-placeholder">{t('contractView.idPlaceholder')}</p>
                                        </div>
                                        <div className="signature-block">
                                            <div className="signature-line"></div>
                                            <p>{t('contractView.tenant')}</p>
                                            <p className="signature-placeholder">{t('contractView.namePlaceholder')}</p>
                                            <p className="signature-placeholder">{t('contractView.idPlaceholder')}</p>
                                        </div>
                                    </div>
                                    <p className="signature-date">{t('contractView.datePlaceholder')}</p>
                                </div>
                            </footer>

                            {/* Bottom anchor for scroll */}
                            <div ref={bottomRef}></div>
                        </>
                    )}
                </div>

                {/* Floating Scroll Button - Hide if minimized */}
                {!isMinimized && (
                    <button
                        className={`scroll-nav-btn no-print ${isAtBottom ? 'at-bottom' : ''}`}
                        onClick={isAtBottom ? scrollToTop : scrollToBottom}
                        title={isAtBottom ? t('contractView.scrollUp') : t('contractView.scrollToSignatures')}
                    >
                        {isAtBottom
                            ? <ArrowUp size={16} strokeWidth={2.4} aria-hidden="true" />
                            : <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />}
                        <span className="scroll-btn-label">
                            {isAtBottom ? t('contractView.up') : t('contractView.toSignatures')}
                        </span>
                    </button>
                )}
            </div>

            {/* ===== HEBREW POPUP EDITOR ===== */}
            {!readOnly && selectedClause && (
                <div
                    className="clause-editor-modal"
                    onClick={closeEditor}
                >
                    <div
                        className="clause-popup-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="popup-header">
                            <h3 className="popup-title">
                                <Edit3 size={20} /> {t('contractView.editClause')}
                            </h3>
                            <button
                                className="popup-close"
                                onClick={closeEditor}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="popup-body" dir="rtl">
                            <div className="popup-section">
                                <label>{t('contractView.originalClauseLabel')}</label>
                                <div className="popup-original-text">
                                    {selectedClause.text}
                                </div>
                            </div>

                            {selectedClause.issue?.suggested_fix && (
                                <div className="popup-section popup-suggested-modern">
                                    <div className="popup-suggested-header">
                                        <span className="popup-suggested-icon"><Sparkles size={16} /></span>
                                        <label>{t('contractView.aiFixSuggestionLabel')}</label>
                                    </div>
                                    <div className="popup-suggested-text">
                                        {selectedClause.issue.suggested_fix}
                                    </div>
                                    <button
                                        className="popup-apply-btn-modern"
                                        onClick={applySuggestedFix}
                                    >
                                        <Check size={16} /> {t('contractView.applySuggestion')}
                                    </button>
                                </div>
                            )}

                            <div className="popup-section">
                                <label>{t('contractView.editLabel')}</label>
                                <textarea
                                    className="popup-textarea"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    dir="rtl"
                                    rows={6}
                                    placeholder={t('contractView.editPlaceholder')}
                                />
                            </div>
                        </div>

                        <div className="popup-footer">
                            <button className="popup-save-btn action-with-icon" onClick={saveEdit}>
                                <Check size={16} /> {t('contractView.finishEditing')}
                            </button>

                            {selectedClause.isEdited && (
                                <button
                                    className="popup-revert-btn action-with-icon"
                                    onClick={(e) => requestRevert(selectedClause.id, e)}
                                >
                                    <Undo2 size={16} /> {t('contractView.revertToOriginal')}
                                </button>
                            )}

                            <button className="popup-cancel-btn" onClick={closeEditor}>
                                {t('contractView.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {!readOnly && consultError && (
                <div className="error-toast no-print">
                    <AlertTriangle size={16} className="error-toast-icon"/>
                    <span>{consultError}</span>
                    <button className="error-toast-close" onClick={() => setConsultError(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Custom Revert Confirmation Modal */}
            {!readOnly && confirmRevertId && (
                <div className="clause-editor-modal" onClick={cancelRevert}>
                    <div
                        className="clause-popup-content small-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="popup-header warning-header">
                            <h3 className="popup-title">
                                <AlertTriangle size={20} /> {t('contractView.confirmRevertTitle')}
                            </h3>
                        </div>
                        <div className="popup-body center-text">
                            <p className="modal-description">
                                {t('contractView.confirmRevertMessage')}
                            </p>
                        </div>
                        <div className="popup-footer center-footer">
                            <button
                                className="popup-revert-btn fixed-width"
                                onClick={confirmRevert}
                            >
                                {t('contractView.confirmRevertYes')}
                            </button>
                            <button
                                className="popup-cancel-btn fixed-width"
                                onClick={cancelRevert}
                            >
                                {t('contractView.confirmRevertNo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Edits Confirmation Modal */}
            {!readOnly && showClearAllConfirm && (
                <div className="clause-editor-modal" onClick={() => setShowClearAllConfirm(false)}>
                    <div
                        className="clause-popup-content small-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="popup-header warning-header">
                            <h3 className="popup-title">
                                <AlertTriangle size={20} /> {t('contractView.clearAllTitle')}
                            </h3>
                        </div>
                        <div className="popup-body center-text">
                            <p className="modal-description">
                                {t('contractView.clearAllMessage')}
                                <br />
                                <span className="warning-text">
                                    {t('contractView.irreversibleWarning')}
                                </span>
                            </p>
                        </div>
                        <div className="popup-footer center-footer">
                            <button
                                className="popup-revert-btn fixed-width"
                                onClick={() => {
                                    updateEditedClauses({});
                                    if (contractId) {
                                        localStorage.removeItem(`rentguard_edits_${contractId}`);
                                    }
                                    setSaveStatus(null);
                                    setShowClearAllConfirm(false);
                                }}
                            >
                                {t('contractView.clearAllYes')}
                            </button>
                            <button
                                className="popup-cancel-btn fixed-width"
                                onClick={() => setShowClearAllConfirm(false)}
                            >
                                {t('contractView.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {!readOnly && consultError && (
                <div className="error-toast no-print">
                    <AlertTriangle size={16} className="error-toast-icon" />
                    <span>{consultError}</span>
                    <button className="error-toast-close" onClick={() => setConsultError(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Custom Revert Confirmation Modal */}
            {!readOnly && confirmRevertId && (
                <div className="clause-editor-modal" onClick={cancelRevert}>
                    <div
                        className="clause-popup-content small-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="popup-header warning-header">
                            <h3 className="popup-title">
                                <AlertTriangle size={20} /> {t('contractView.confirmRevertTitle')}
                            </h3>
                        </div>
                        <div className="popup-body center-text">
                            <p className="modal-description">
                                {t('contractView.confirmRevertMessage')}
                            </p>
                        </div>
                        <div className="popup-footer center-footer">
                            <button
                                className="popup-revert-btn fixed-width"
                                onClick={confirmRevert}
                            >
                                {t('contractView.confirmRevertYes')}
                            </button>
                            <button
                                className="popup-cancel-btn fixed-width"
                                onClick={cancelRevert}
                            >
                                {t('contractView.confirmRevertNo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Edits Confirmation Modal */}
            {!readOnly && showClearAllConfirm && (
                <div className="clause-editor-modal" onClick={() => setShowClearAllConfirm(false)}>
                    <div
                        className="clause-popup-content small-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="popup-header warning-header">
                            <h3 className="popup-title">
                                <AlertTriangle size={20} /> {t('contractView.clearAllTitle')}
                            </h3>
                        </div>
                        <div className="popup-body center-text">
                            <p className="modal-description">
                                {t('contractView.clearAllMessage')}
                                <br />
                                <span className="warning-text">{t('contractView.irreversibleWarning')}</span>
                            </p>
                        </div>
                        <div className="popup-footer center-footer">
                            <button
                                className="popup-revert-btn fixed-width"
                                onClick={() => {
                                    updateEditedClauses({});
                                    if (contractId) {
                                        localStorage.removeItem(`rentguard_edits_${contractId}`);
                                    }
                                    setSaveStatus(null);
                                    setShowClearAllConfirm(false);
                                }}
                            >
                                {t('contractView.clearAllYes')}
                            </button>
                            <button
                                className="popup-cancel-btn fixed-width"
                                onClick={() => setShowClearAllConfirm(false)}
                            >
                                {t('contractView.cancel')}
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