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
import { processContractClauses } from '@/features/analysis/utils/contractTextProcessor';
import { consultClause } from '@/features/analysis/services/analysisApi';
import { exportEditedContractToWord, exportEditedContractToWordBlob } from '@/features/analysis/services/ContractExportService';
import { showAppToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import ContractViewSignatures from './ContractViewSignatures';
import EditClauseModal from './EditClauseModal';
import ClauseRow from './ClauseRow';
import ContractToolbar from './ContractToolbar';
import './ContractView.css';

const FUZZY_MATCH_STRIP_PATTERN = /[\s\t\r\n.,\-:;"']+/g;
const MIN_FUZZY_MATCH_LENGTH = 15;

const normalizeForFuzzyClauseMatch = (text) => {
    return String(text || '')
        .toLowerCase()
        .replace(FUZZY_MATCH_STRIP_PATTERN, '');
};

const isFuzzyClauseMatch = (issueText, clauseText) => {
    const normalizedIssue = normalizeForFuzzyClauseMatch(issueText);
    const normalizedClause = normalizeForFuzzyClauseMatch(clauseText);

    if (!normalizedIssue || !normalizedClause) return false;
    if (normalizedIssue.length < MIN_FUZZY_MATCH_LENGTH || normalizedClause.length < MIN_FUZZY_MATCH_LENGTH) return false;

    // Strict overlap check
    if (
        normalizedClause === normalizedIssue ||
        normalizedClause.includes(normalizedIssue) ||
        normalizedIssue.includes(normalizedClause)
    ) {
        return true;
    }

    // Word intersection for OCR resilience
    const getWords = (t) => String(t || '').toLowerCase().replace(/[.,\-:;"'()[\]{}*&^%$#@!\\|?><]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const issueWords = getWords(issueText);
    const clauseWords = getWords(clauseText);
    
    if (issueWords.length < 3 || clauseWords.length < 3) return false;
    
    let matchCount = 0;
    for (const w of issueWords) {
        if (clauseWords.includes(w)) {
            matchCount++;
        }
    }
    
    const matchRatio = matchCount / issueWords.length;
    const requiredRatio = issueWords.length < 5 ? 0.9 : 0.75;
    return matchRatio >= requiredRatio;
};

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
    onEditedClausesChange,
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

        // 1. Initialize all clauses
        const clauseObjects = processedClauses.map((text, index) => ({
            id: `clause-${index}`,
            text: text.trim(),
            hasIssue: false,
            issue: null,
            isEdited: !!editedClauses[`clause-${index}`],
            issues: []
        }));

        // 2. Map issues to best clause using bi-grams
        issues.forEach(issue => {
            const issueTextCandidate = [
                issue.original_text,
                issue.original,
                issue.clause_text,
                issue.clause,
                issue.finding_text
            ].find(Boolean) || '';
            
            const issueText = String(issueTextCandidate).toLowerCase().trim();
            if (!issueText) return;

            let bestClause = null;
            let bestScore = -1;

            const getBigrams = (str) => {
                const s = str.replace(/\s+/g, ' ');
                const bigrams = new Set();
                for (let i = 0; i < s.length - 1; i++) {
                    bigrams.add(s.substring(i, i + 2));
                }
                return bigrams;
            };
            
            const issueBigrams = getBigrams(issueText);

            clauseObjects.forEach(clause => {
                const clauseTextLower = clause.text.toLowerCase().trim();
                let score = 0;

                // Strict substring match: only consider it 1.0 if the clause is not a tiny number 
                // OR if it's the exact match. 
                if (clauseTextLower === issueText || clauseTextLower.includes(issueText) || (clauseTextLower.length > 15 && issueText.includes(clauseTextLower))) {
                    score = 1.0;
                } else if (issueBigrams.size > 0) {
                    const clauseBigrams = getBigrams(clauseTextLower);
                    let intersection = 0;
                    issueBigrams.forEach(bg => {
                        if (clauseBigrams.has(bg)) intersection++;
                    });
                    score = intersection / issueBigrams.size;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestClause = clause;
                }
            });

            // Even a very low threshold (15%) is better than dropping the issue.
            // If OCR is completely unreadable (0%), attach to first clause
            if (bestClause && bestScore >= 0.15) {
                bestClause.issues.push(issue);
            } else if (clauseObjects.length > 0) {
                clauseObjects[0].issues.push(issue);
            }
        });

        // 3. Mark hasIssue for UI
        clauseObjects.forEach(clause => {
            if (clause.issues && clause.issues.length > 0) {
                clause.hasIssue = true;
                clause.issue = { ...clause.issues[0] }; // Backward compatibility for other components
            }
        });

        return clauseObjects;
    }, [contractText, backendClauses, issues, editedClauses]);

    const getClauseTextFromEdits = useCallback((clause, editsMap) => {
        const edit = (editsMap || {})[clause.id];
        if (edit?.text) {
            let originalNumber = edit.originalNumber;
            if (!originalNumber) {
                originalNumber = clause.text?.match(/^(\d+\.)\s*/)?.[1];
            }
            if (!originalNumber && clause.issues?.length > 0 && clause.issues[0].original_text) {
                originalNumber = clause.issues[0].original_text?.match(/^(\d+\.)\s*/)?.[1];
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

const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const [showScrollUp, setShowScrollUp] = useState(false);

    const isFirstRender = useRef(true);
    const saveTimeoutRef = useRef(null);
    const saveStatusTimeoutRef = useRef(null);
    const lastCloudSaveSignatureRef = useRef('');
    const lastReportedEditStateRef = useRef('');
    const lastPushedEditsRef = useRef(initialEditedClauses);

    useEffect(() => {
        if (!initialEditedClauses || typeof initialEditedClauses !== 'object') return;

        // If the parent is passing back exactly what we just emitted, ignore it to prevent infinite loops.
        if (initialEditedClauses === lastPushedEditsRef.current) return;

        // Keep local state aligned with parent source-of-truth, including explicit resets to an empty object.
        const currentStr = JSON.stringify(editedClausesRef.current || {});
        const newStr = JSON.stringify(initialEditedClauses);
        if (currentStr !== newStr) {
            editedClausesRef.current = initialEditedClauses;
            setEditedClauses(initialEditedClauses);
            lastCloudSaveSignatureRef.current = newStr;
        }
    }, [initialEditedClauses]);

    useEffect(() => {
        lastPushedEditsRef.current = editedClauses;
        onEditedClausesChange?.(editedClauses);
    }, [editedClauses, onEditedClausesChange]);

    useEffect(() => {
        if (readOnly || !contractId) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                editedClausesRef.current = parsed;
                setEditedClauses(parsed);
                lastCloudSaveSignatureRef.current = saved;
            }
        } catch (error) {
            console.warn('Failed to load saved edits:', error);
        }
    }, [contractId, readOnly]);

    useEffect(() => {
        if (readOnly || !contractId) return;
        const storageKey = `rentguard_edits_${contractId}`;
        try {
            if (Object.keys(editedClauses).length === 0) {
                localStorage.removeItem(storageKey);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(editedClauses));
            }
        } catch (error) {
            console.warn('Failed to save edits:', error);
        }
    }, [contractId, editedClauses, readOnly]);

    useEffect(() => {
        if (readOnly || !onSaveToCloud || !contractId) return;

        const currentEditsSignature = JSON.stringify(editedClauses);    

        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Prevent overriding the signature if a previous effect just hydrated it
            if (!lastCloudSaveSignatureRef.current) {
                lastCloudSaveSignatureRef.current = currentEditsSignature;
            }
            return;
        }

        if (currentEditsSignature === lastCloudSaveSignatureRef.current) return;

        const fullEditedText = clauses.map(c => getClauseText(c)).join('\n\n');

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveStatus('saving');

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await onSaveToCloud(editedClauses, fullEditedText);
                lastCloudSaveSignatureRef.current = currentEditsSignature;
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
        const handleScroll = (e) => {
            // Toggle arrow direction based on the internal container scroll
            if (containerRef.current) {
                setShowScrollUp(containerRef.current.scrollTop > 200);
            } else {
                setShowScrollUp(window.scrollY > 200);
            }
        };

        // Attach global document scroll with capture perfectly tracks ALL scrolling elements
        document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        
        // Initial setup
        handleScroll();
        
        return () => {
            document.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, []);

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    const scrollToTop = () => {
        // Scroll the actual contract wrapper to the top
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Also scroll the window to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Scroll the main container if it exists
        const mainScrollContainer = document.querySelector('main, .app-main, .lf-cv-container');
        if (mainScrollContainer) {
            mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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
            onClauseChange?.(confirmRevertId, '', 'reverted');
            if (selectedClause?.id === confirmRevertId) closeEditor();
            setConfirmRevertId(null);
        }
    };

    const cancelRevert = () => setConfirmRevertId(null);

    const saveEdit = () => {
        if (selectedClause && editingText.trim()) {
            let originalNumber = extractClauseNumber(selectedClause.text);
            if (!originalNumber && selectedClause.issues?.length > 0 && selectedClause.issues[0].original_text) {
                originalNumber = extractClauseNumber(selectedClause.issues[0].original_text);
            }

            updateEditedClauses(prev => ({
                ...prev,
                [selectedClause.id]: {
                    text: editingText.trim(),
                    action: 'edited',
                    originalNumber: originalNumber 
                }
            }));
            onClauseChange?.(selectedClause.id, editingText.trim(), 'edited', { originalNumber });
            setSaveStatus(null);
        }
        closeEditor();
    };

    const applySuggestedFix = (issue) => {
        const fixText = issue?.suggested_fix || issue?.recommendation || issue?.suggestedFix || issue?.solution || issue?.fix;
        if (fixText) {
            setEditingText(fixText);
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
        try {
            showAppToast({
                type: 'warning',
                title: t('contractView.ocrDisclaimerTitle'),
                message: t('contractView.ocrDisclaimerBody2'),
                ttlMs: 5000,
            });
            showAppToast({ type: 'info', message: t('export.started') });
            const currentEdits = editedClausesRef.current || {};
            const clauseTexts = clauses.map(c => getClauseTextFromEdits(c, currentEdits));
            await exportEditedContractToWord(clauseTexts, currentEdits, t('export.defaultContractFilename'), { t, isRtl: isRTL });
            showAppToast({ type: 'success', message: t('export.success') });
        } catch (error) {
            console.error('Contract export error:', error);
            showAppToast({ type: 'error', message: t('export.error') });
        }
    }, [clauses, getClauseTextFromEdits, t, isRTL]);

    const handleGetDocxBlob = useCallback(async () => {
        const currentEdits = editedClausesRef.current || {};
        const clauseTexts = clauses.map(c => getClauseTextFromEdits(c, currentEdits));
        return await exportEditedContractToWordBlob(clauseTexts, currentEdits, t('export.defaultContractFilename'), { t, isRtl: isRTL });
    }, [clauses, getClauseTextFromEdits, t, isRTL]);

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

    return (
        <div className="lf-cv-container" dir={isRTL ? 'rtl' : 'ltr'}>
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

            <div className={`lf-cv-paper ${isMinimized ? 'minimized' : ''}`} ref={containerRef}>

                {/* ===== HEADER ===== */}
                <header className="lf-cv-header">
                    <h1>{t('contractView.contractTitle')}</h1>
                    <p>{t('contractView.contractSubtitle')}</p>
                </header>

                {!isMinimized && (
                    <>
                        {/* ===== TOOLBAR ===== */}
                        <ContractToolbar 
                            readOnly={readOnly}
                            showOnlyIssues={showOnlyIssues}
                            setShowOnlyIssues={setShowOnlyIssues}
                            t={t}
                            stats={stats}
                        />

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
                                    <ClauseRow
                                        key={clause.id}
                                        clause={clause}
                                        readOnly={readOnly}
                                        t={t}
                                        getClauseText={getClauseText}
                                        clauseExplanations={clauseExplanations}
                                        consultingClauseId={consultingClauseId}
                                        handleConsultClause={handleConsultClause}
                                        expandedExplanations={expandedExplanations}
                                        toggleExplanation={toggleExplanation}
                                        editedClauses={editedClauses}
                                        updateEditedClauses={updateEditedClauses}
                                        onClauseChange={onClauseChange}
                                        requestRevert={requestRevert}
                                        openEditor={openEditor}
                                    />
                                ))
                            )}
                        </div>

                        {/* ===== SIGNATURE FOOTER ===== */}
                        <ContractViewSignatures t={t} />

                        <div ref={bottomRef}></div>

                        {/* Floating Scroll Button Wrapper inside Paper */}
                        <div className="lf-cv-scroll-fab-wrapper">
                            <button
                                className={`lf-cv-scroll-fab no-print ${showScrollUp ? 'at-bottom' : ''}`}
                                onClick={showScrollUp ? scrollToTop : scrollToBottom}
                                title={showScrollUp ? t('contractView.scrollUp') : t('contractView.scrollToSignatures')}
                            >
                                {showScrollUp ? <ArrowUp size={16} strokeWidth={2.4} /> : <ArrowDown size={16} strokeWidth={2.4} />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ===== MODALS ===== */}

            {/* Edit Modal */}
            {!readOnly && selectedClause && (
                <EditClauseModal
                    t={t}
                    isRTL={isRTL}
                    selectedClause={selectedClause}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    saveEdit={saveEdit}
                    requestRevert={requestRevert}
                    closeEditor={closeEditor}
                    applySuggestedFix={applySuggestedFix}
                />
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
                                onClauseChange?.(null, '', 'cleared');
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