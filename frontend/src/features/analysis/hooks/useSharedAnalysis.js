import { useState, useCallback, useMemo, useEffect } from 'react';
import { getSharedAnalysis } from '@/features/analysis/services/analysisApi';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

export const useSharedAnalysis = (id) => {
    const { t } = useLanguage();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const shareToken = useMemo(() => decodeURIComponent(id || ''), [id]);

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

    useEffect(() => {
        fetchSharedAnalysis();
    }, [fetchSharedAnalysis]);

    const result = analysis?.analysis_result || analysis;
    const isContract = result?.is_contract !== false;
    const contractText = analysis?.normalizedContractText || '';
    const clauses = analysis?.clauses_list || analysis?.clauses || [];

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
