/**
 * Controller hook for the public (unauthenticated) shared contract viewing page.
 * Loads the shared snapshot using a signed token, computes client-side diffs between 
 * the original document and the edited snapshot to render highlighted changes for guests.
 * 
 * @param {string} id The encoded sharing token from the URL params.
 * @returns {Object} Read-only parsed contract payload with computed difference maps.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { getSharedAnalysis } from '@/features/analysis/services/analysisApi';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

export const useSharedAnalysis = (id) => {
    const { t } = useLanguage();
    // --- STATE MANAGEMENT ---
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    /**
     * Safely decodes the URL parameter to get the exact share token.
     * Memoized to prevent unnecessary re-computations when the token hasn't changed.
     */
    const shareToken = useMemo(() => decodeURIComponent(id || ''), [id]);

    /**
     * FETCH OPERATION:
     * Communicates with the public backend endpoint to fetch the document snapshot
     * using the share token. Manages loading flags and translates error statuses.
     */
    const fetchSharedAnalysis = useCallback(async () => {
        if (!shareToken) {
            setError(t('sharedContract.invalidLink'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const data = await getSharedAnalysis(shareToken);
            setAnalysis(data);
        } catch (err) {
            console.error('Failed to load shared contract', err);
            setError(t('sharedContract.loadFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [shareToken, t]);

    /**
     * INIT PHASE: 
     * Automatically trigger the fetch operation as soon as the hook is mounted
     * or when the specific share token dependency changes.
     */
    useEffect(() => {
        fetchSharedAnalysis();
    }, [fetchSharedAnalysis]);

    // --- DATA EXTRACTION & FALLBACKS ---
    // Extract properties cleanly, handling different backend structures
    // (some server responses nest data under 'analysis_result', others flat)
    const result = analysis?.analysis_result || analysis;
    const isContract = result?.is_contract !== false;
    const contractText = analysis?.normalizedContractText || '';
    const clauses = analysis?.clauses_list || analysis?.clauses || [];

    /**
     * CLIENT-SIDE DIFF COMPUTATION: Calculates differences between original clauses 
     * and the edited clauses made by the contract owner before generating the share link.
     * 
     * Logic Flow:
     * 1. If backend already provides pre-computed 'editedClauses', return them directly.
     * 2. Normalize and compare both original and current arrays simultaneously.
     * 3. Construct a 'delta' dictionary mapping indices of modified clauses (clause-0, clause-1)
     *    with their new updated text and the 'shared-diff' styling action tag.
     */
    const sharedEditedClauses = useMemo(() => {
        if (analysis?.editedClauses && typeof analysis.editedClauses === 'object') {
            return analysis.editedClauses;
        }

        const originalRaw = Array.isArray(analysis?.originalClausesList)
            ? analysis.originalClausesList
            : (Array.isArray(analysis?.original_clauses_list) ? analysis.original_clauses_list : []);
        const currentRaw = Array.isArray(analysis?.clauses_list)
            ? analysis.clauses_list
            : (Array.isArray(analysis?.clauses) ? analysis.clauses : []);

        const originalClauses = originalRaw;
        const currentClauses = currentRaw;

        if (!originalClauses.length || !currentClauses.length) {
            return {};
        }

        const delta = {};
        const maxLen = Math.max(originalClauses.length, currentClauses.length);
        for (let idx = 0; idx < maxLen; idx += 1) {
            const originalText = String(originalClauses[idx] || '').trim();
            const currentText = String(currentClauses[idx] || '').trim();
            if (currentText && originalText !== currentText) {
                delta[`clause-${idx}`] = { text: currentText, action: 'shared-diff' };
            }
        }

        return delta;
    }, [analysis]);

    return {
        isLoading,
        error,
        analysis,
        isContract,
        contractText,
        clauses,
        sharedEditedClauses,
        fetchSharedAnalysis
    };
};
