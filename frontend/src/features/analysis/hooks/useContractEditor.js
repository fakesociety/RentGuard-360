import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { processContractClauses } from '@/features/analysis/utils/contractTextProcessor';
import { consultClause } from '@/features/analysis/services/analysisApi';
import { exportEditedContractToWord, exportEditedContractToWordBlob } from '@/features/analysis/services/ContractExportService';
import { showAppToast } from '@/components/ui/toast/toast';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { extractFixText } from '@/features/analysis/utils/analysisUtils';
import { extractClauseNumber } from '@/features/analysis/utils/stringUtils';

export const useContractEditor = ({
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
}) => {
    const { t, isRTL } = useLanguage();
    const [editedClauses, setEditedClauses] = useState(() => initialEditedClauses || {});
    const editedClausesRef = useRef(initialEditedClauses || {});
    const [saveStatus, setSaveStatus] = useState(null);

    const [selectedClause, setSelectedClause] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [confirmRevertId, setConfirmRevertId] = useState(null);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

    const [consultingClauseId, setConsultingClauseId] = useState(null);
    const [clauseExplanations, setClauseExplanations] = useState({});
    const [expandedExplanations, setExpandedExplanations] = useState({});
    const [consultError, setConsultError] = useState(null);

    const isFirstRender = useRef(true);
    const saveTimeoutRef = useRef(null);
    const saveStatusTimeoutRef = useRef(null);
    const lastCloudSaveSignatureRef = useRef('');
    const lastReportedEditStateRef = useRef('');
    const lastPushedEditsRef = useRef(initialEditedClauses);

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

        const clauseObjects = processedClauses.map((text, index) => ({
            id: `clause-${index}`,
            text: text.trim(),
            hasIssue: false,
            issue: null,
            isEdited: !!editedClauses[`clause-${index}`],
            issues: []
        }));

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

            if (bestClause && bestScore >= 0.15) {
                bestClause.issues.push(issue);
            } else if (clauseObjects.length > 0) {
                clauseObjects[0].issues.push(issue);
            }
        });

        clauseObjects.forEach(clause => {
            if (clause.issues && clause.issues.length > 0) {
                clause.hasIssue = true;
                clause.issue = { ...clause.issues[0] };
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

    useEffect(() => {
        if (!initialEditedClauses || typeof initialEditedClauses !== 'object') return;
        if (initialEditedClauses === lastPushedEditsRef.current) return;

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

    const openEditor = (clause) => {
        if (readOnly) return;
        setSelectedClause(clause);
        setEditingText(getClauseText(clause));
    };

    const closeEditor = () => {
        setSelectedClause(null);
        setEditingText('');
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
        const fixText = extractFixText(issue);
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
    }, [clauses, getClauseTextFromEdits, t, isRTL, editedClausesRef]);

    const handleGetDocxBlob = useCallback(async () => {
        const currentEdits = editedClausesRef.current || {};
        const clauseTexts = clauses.map(c => getClauseTextFromEdits(c, currentEdits));
        return await exportEditedContractToWordBlob(clauseTexts, currentEdits, t('export.defaultContractFilename'), { t, isRtl: isRTL });
    }, [clauses, getClauseTextFromEdits, t, isRTL, editedClausesRef]);

    const getCurrentEditedPayload = useCallback(() => {
        const currentEdits = editedClausesRef.current || {};
        const fullEditedText = clauses.map(c => getClauseTextFromEdits(c, currentEdits)).join('\n\n');
        return { editedClauses: currentEdits, fullEditedText };
    }, [clauses, getClauseTextFromEdits, editedClausesRef]);

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

    return {
        editedClauses,
        updateEditedClauses,
        saveStatus,
        setSaveStatus,
        selectedClause,
        setSelectedClause,
        editingText,
        setEditingText,
        confirmRevertId,
        setConfirmRevertId,
        showClearAllConfirm,
        setShowClearAllConfirm,
        consultingClauseId,
        clauseExplanations,
        expandedExplanations,
        consultError,
        setConsultError,
        clauses,
        getClauseText,
        openEditor,
        closeEditor,
        requestRevert,
        confirmRevert,
        cancelRevert,
        saveEdit,
        applySuggestedFix,
        handleConsultClause,
        toggleExplanation,
        handleExport,
        handleGetDocxBlob,
        getCurrentEditedPayload,
        stats
    };
};
