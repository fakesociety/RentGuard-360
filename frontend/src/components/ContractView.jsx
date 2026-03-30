/**
 * ============================================
 * ContractView
 * Virtual PDF Contract Display & Editor (LexisFlow Modern UI)
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

    const [isMinimized, setIsMinimized] = useState(false);

    const [selectedClause, setSelectedClause] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [confirmRevertId, setConfirmRevertId] = useState(null);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

    const [consultingClauseId, setConsultingClauseId] = useState(null);
    const [clauseExplanations, setClauseExplanations] = useState({});
    const [expandedExplanations, setExpandedExplanations] = useState({});
    const [consultError, setConsultError] = useState(null);

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

    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(false);

    const isFirstRender = useRef(true);
    const saveTimeoutRef = useRef(null);
    const saveStatusTimeoutRef = useRef(null);
    const skipNextCloudSaveRef = useRef(false);
    const lastCloudSaveSignatureRef = useRef('');
    const lastReportedEditStateRef = useRef('');

    useEffect(() => {
        if (readOnly || !contractId) return;
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

    useEffect(() => {
        if (readOnly || !contractId || Object.keys(editedClauses).length === 0) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(editedClauses));
        } catch (error) {
            console.warn('Failed to save edits:', error);
        }
    }, [contractId, editedClauses, readOnly]);

    useEffect(() => {
        if (readOnly || !onSaveToCloud || !contractId) return;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            const initialText = clauses.map(c => getClauseText(c)).join('\n\n');
            lastCloudSaveSignatureRef.current = JSON.stringify({
                contractId, editedClauses, fullEditedText: initialText,
            });
            return;
        }

        if (skipNextCloudSaveRef.current) {
            skipNextCloudSaveRef.current = false;
            const skippedText = clauses.map(c => getClauseText(c)).join('\n\n');
            lastCloudSaveSignatureRef.current = JSON.stringify({
                contractId, editedClauses, fullEditedText: skippedText,
            });
            return;
        }

        if (Object.keys(editedClauses).length === 0) return;

        const fullEditedText = clauses.map(c => getClauseText(c)).join('\n\n');
        const saveSignature = JSON.stringify({ contractId, editedClauses, fullEditedText });

        if (saveSignature === lastCloudSaveSignatureRef.current) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveStatus('saving');

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await onSaveToCloud(editedClauses, fullEditedText);
                lastCloudSaveSignatureRef.current = saveSignature;
                setSaveStatus('success');
                if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
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
            if (selectedClause?.id === confirmRevertId) closeEditor();
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
        setExpandedExplanations(prev => ({ ...prev, [clauseId]: !prev[clauseId] }));
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
        return { editedClauses: currentEdits, fullEditedText };
    }, [clauses, getClauseTextFromEdits]);

    const filteredClauses = showOnlyIssues ? clauses.filter(c => c.hasIssue) : clauses;

    const stats = {
        total: clauses.length,
        withIssues: clauses.filter(c => c.hasIssue).length,
        edited: Object.keys(editedClauses).length
    };

    useEffect(() => {
        if (!onEditStateChange) return;
        const next = { editedCount: Object.keys(editedClauses).length, saveStatus };
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
        <div className="lf-cv-container">
            <div className={`lf-cv-paper ${isMinimized ? 'minimized' : ''}`} ref={containerRef}>
                
                {/* ===== MINIMIZE / MAXIMIZE CONTROLS ===== */}
                <div className="lf-cv-actions no-print">
                    <button 
                        className="lf-cv-minimize-btn" 
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? t('contractView.expand') : t('contractView.collapse')}
                    >
                        {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                        <span>{isMinimized ? t('contractView.expand') : t('contractView.collapse')}</span>
                    </button>
                </div>

                {/* ===== HEADER ===== */}
                <header className="lf-cv-header">
                    <h1>{t('contractView.contractTitle')}</h1>
                    <p>{t('contractView.contractSubtitle')}</p>
                </header>

                {!isMinimized && (
                    <>
                        {/* ===== TOOLBAR ===== */}
                        <div className="lf-cv-toolbar no-print">
                            <div className="lf-cv-toolbar-left">
                                {!readOnly && (
                                    <label className="lf-cv-filter-toggle">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyIssues}
                                            onChange={(e) => setShowOnlyIssues(e.target.checked)}
                                        />
                                        <span>{t('contractView.showOnlyProblemClauses')}</span>
                                    </label>
                                )}
                            </div>
                            <div className="lf-cv-toolbar-stats">
                                <span className="lf-cv-stat-badge neutral">
                                    {stats.total} {t('contractView.clausesCountSuffix')}
                                </span>
                                {stats.withIssues > 0 && (
                                    <span className="lf-cv-stat-badge warning">
                                        <AlertTriangle size={14} /> {stats.withIssues} {t('contractView.issuesCountSuffix')}
                                    </span>
                                )}
                                {stats.edited > 0 && (
                                    <span className="lf-cv-stat-badge success">
                                        <Edit3 size={14} /> {stats.edited} {t('contractView.editedCountSuffix')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ===== CLAUSES LIST ===== */}
                        <div className="lf-cv-clauses-list">
                            {filteredClauses.length === 0 ? (
                                <div className="lf-cv-no-clauses">
                                    {showOnlyIssues ? (
                                        <div className="lf-cv-no-issues-msg">
                                            <PartyPopper size={24} /> 
                                            <span>{t('contractView.noIssuesFound')}</span>
                                        </div>
                                    ) : t('contractView.noTextFound')}
                                </div>
                            ) : (
                                filteredClauses.map((clause) => (
                                    <div key={clause.id} className="lf-cv-clause-row">
                                        
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
                                            <div className="lf-cv-clause-text-area">
                                                <p className="lf-cv-clause-text" dir="rtl">
                                                    {getClauseText(clause)}
                                                </p>

                                                {!readOnly && (
                                                    <div className="lf-cv-clause-actions no-print">
                                                        {!clauseExplanations[clause.id] && (
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
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Edit Hint Overlay */}
                                            {!readOnly && (
                                                <div className="lf-cv-hover-hint no-print">
                                                    <Pen size={14} /> {t('contractView.edit')}
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
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ===== SIGNATURE FOOTER ===== */}
                        <footer className="lf-cv-signatures-footer">
                            <h3>{t('contractView.signaturesTitle')}</h3>
                            <div className="lf-cv-signatures-grid">
                                <div className="lf-cv-signature-block">
                                    <div className="lf-cv-sig-line"></div>
                                    <p className="lf-cv-sig-role">{t('contractView.landlord')}</p>
                                    <p className="lf-cv-sig-placeholder">{t('contractView.namePlaceholder')}</p>
                                    <p className="lf-cv-sig-placeholder">{t('contractView.idPlaceholder')}</p>
                                </div>
                                <div className="lf-cv-signature-block">
                                    <div className="lf-cv-sig-line"></div>
                                    <p className="lf-cv-sig-role">{t('contractView.tenant')}</p>
                                    <p className="lf-cv-sig-placeholder">{t('contractView.namePlaceholder')}</p>
                                    <p className="lf-cv-sig-placeholder">{t('contractView.idPlaceholder')}</p>
                                </div>
                            </div>
                            <p className="lf-cv-sig-date">{t('contractView.datePlaceholder')}</p>
                        </footer>

                        <div ref={bottomRef}></div>
                    </>
                )}
            </div>

            {/* Floating Scroll Button */}
            {!isMinimized && (
                <button
                    className={`lf-cv-scroll-fab no-print ${isAtBottom ? 'at-bottom' : ''}`}
                    onClick={isAtBottom ? scrollToTop : scrollToBottom}
                    title={isAtBottom ? t('contractView.scrollUp') : t('contractView.scrollToSignatures')}
                >
                    {isAtBottom ? <ArrowUp size={20} strokeWidth={2.4} /> : <ArrowDown size={20} strokeWidth={2.4} />}
                </button>
            )}

            {/* ===== MODALS ===== */}

            {/* Edit Modal */}
            {!readOnly && selectedClause && (
                <div className="lf-cv-modal-overlay" onClick={closeEditor}>
                    <div className="lf-cv-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="lf-cv-modal-header">
                            <h3><Edit3 size={20} /> {t('contractView.editClause')}</h3>
                            <button className="lf-cv-modal-close" onClick={closeEditor}><X size={20} /></button>
                        </div>

                        <div className="lf-cv-modal-body" dir="rtl">
                            <div className="lf-cv-modal-section">
                                <label>{t('contractView.originalClauseLabel')}</label>
                                <div className="lf-cv-original-text">{selectedClause.text}</div>
                            </div>

                            {selectedClause.issue?.suggested_fix && (
                                <div className="lf-cv-modal-section lf-cv-suggested-section">
                                    <div className="lf-cv-suggested-header">
                                        <Sparkles size={16} /> <label>{t('contractView.aiFixSuggestionLabel')}</label>
                                    </div>
                                    <div className="lf-cv-suggested-text">{selectedClause.issue.suggested_fix}</div>
                                    <button className="lf-cv-apply-btn" onClick={applySuggestedFix}>
                                        <Check size={16} /> {t('contractView.applySuggestion')}
                                    </button>
                                </div>
                            )}

                            <div className="lf-cv-modal-section">
                                <label>{t('contractView.editLabel')}</label>
                                <textarea
                                    className="lf-cv-textarea"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    dir="rtl"
                                    rows={6}
                                    placeholder={t('contractView.editPlaceholder')}
                                />
                            </div>
                        </div>

                        <div className="lf-cv-modal-footer">
                            <button className="lf-cv-btn-primary" onClick={saveEdit}>
                                <Check size={16} /> {t('contractView.finishEditing')}
                            </button>

                            {selectedClause.isEdited && (
                                <button className="lf-cv-btn-revert" onClick={(e) => requestRevert(selectedClause.id, e)}>
                                    <Undo2 size={16} /> {t('contractView.revertToOriginal')}
                                </button>
                            )}

                            <button className="lf-cv-btn-cancel" onClick={closeEditor}>
                                {t('contractView.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {!readOnly && consultError && (
                <div className="lf-cv-error-toast no-print">
                    <AlertTriangle size={16} />
                    <span>{consultError}</span>
                    <button onClick={() => setConsultError(null)}><X size={16} /></button>
                </div>
            )}

            {/* Revert Confirmation Modal */}
            {!readOnly && confirmRevertId && (
                <div className="lf-cv-modal-overlay" onClick={cancelRevert}>
                    <div className="lf-cv-modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="lf-cv-modal-header warning">
                            <h3><AlertTriangle size={20} /> {t('contractView.confirmRevertTitle')}</h3>
                        </div>
                        <div className="lf-cv-modal-body center-text">
                            <p>{t('contractView.confirmRevertMessage')}</p>
                        </div>
                        <div className="lf-cv-modal-footer center-footer">
                            <button className="lf-cv-btn-revert" onClick={confirmRevert}>{t('contractView.confirmRevertYes')}</button>
                            <button className="lf-cv-btn-cancel" onClick={cancelRevert}>{t('contractView.confirmRevertNo')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {!readOnly && showClearAllConfirm && (
                <div className="lf-cv-modal-overlay" onClick={() => setShowClearAllConfirm(false)}>
                    <div className="lf-cv-modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="lf-cv-modal-header warning">
                            <h3><AlertTriangle size={20} /> {t('contractView.clearAllTitle')}</h3>
                        </div>
                        <div className="lf-cv-modal-body center-text">
                            <p>
                                {t('contractView.clearAllMessage')}<br/>
                                <strong className="lf-cv-text-danger">{t('contractView.irreversibleWarning')}</strong>
                            </p>
                        </div>
                        <div className="lf-cv-modal-footer center-footer">
                            <button className="lf-cv-btn-revert" onClick={() => {
                                updateEditedClauses({});
                                if (contractId) localStorage.removeItem(`rentguard_edits_${contractId}`);
                                setSaveStatus(null);
                                setShowClearAllConfirm(false);
                            }}>
                                {t('contractView.clearAllYes')}
                            </button>
                            <button className="lf-cv-btn-cancel" onClick={() => setShowClearAllConfirm(false)}>
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