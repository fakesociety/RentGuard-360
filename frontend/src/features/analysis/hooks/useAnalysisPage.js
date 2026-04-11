/**
 * ============================================
 *  useAnalysisPage Hook
 *  Core logic for viewing contract analysis
 * ============================================
 * 
 * STRUCTURE:
 * - fetchAnalysis: Loads contract data (polls if pending)
 * - handleExportWord: Docs generation
 * - Share link generation and revoking
 * - saving/editing contract state tracking 
 * 
 * DEPENDENCIES:
 * - API Calls
 * - ReportExportService
 * ============================================
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getAnalysis, saveEditedContract } from '@/features/analysis/services/analysisApi';
import { exportReportToWord } from '@/features/analysis/services/ReportExportService';
import { showAppToast as emitAppToast } from '@/utils/toast';
import { readMetadataCache, persistMetadataCache } from '@/features/analysis/services/cacheService';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useContractShare } from '@/features/analysis/hooks/useContractShare';

export const useAnalysisPage = () => {
    const { contractId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { state } = location;
    const { t, isRTL } = useLanguage();
    const { userAttributes } = useAuth();
    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

    // Core Contract Data
    const [analysis, setAnalysis] = useState(state?.contract || null);
    const [isLoading, setIsLoading] = useState(!state?.contract);
    const [error, setError] = useState(null);

    // Export State
    const [isExporting, setIsExporting] = useState(false);

    // Contract Editor (Manual overrides by user)
    const [contractEditState, setContractEditState] = useState({ editedCount: 0, saveStatus: null });
    const [_editedClauses, setEditedClauses] = useState({});

    // Backend Polling (For async AWS process)
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_ATTEMPTS = 12;
    const INITIAL_DELAY = 15000;
    const POLL_INTERVAL = 10000;

    // DOM & State Refs
    const contractViewRef = useRef(null);
    const prevSaveStatusRef = useRef(null);
    const lastSavingToastAtRef = useRef(0);
    const hydratedEditsContractRef = useRef(null);

    // Saves user's manual contract edits to AWS
    const handleSaveToCloud = useCallback(async (clauses, fullEditedText) => {
        const userId = userAttributes?.sub || 'unknown-user';
        const contractIdClean = analysis?.contractId || contractId;
        await saveEditedContract(contractIdClean, userId, clauses, fullEditedText);
    }, [analysis?.contractId, contractId, userAttributes?.sub]);

    // Sharing Hook Logic
    const {
        isGeneratingShareLink,
        isRevokingShareLink,
        shareLink,
        shareLinkExpiresAt,
        isSharePanelVisible,
        sharePanelRef,
        handleCopyShareLink,
        handleManualCopyShareLink,
        handleShareLinkViaApps,
        handleRevokeShareLink
    } = useContractShare({
        contractId: analysis?.contractId || contractId,
        onSaveBeforeShare: async () => {
            const currentPayload = contractViewRef.current?.getCurrentEditedPayload?.();
            if (currentPayload) {
                await handleSaveToCloud(
                    currentPayload.editedClauses || {},
                    currentPayload.fullEditedText || ''
                );
            }
        }
    });

    // Core Fetch & Poll logic for the AI Contract Analysis
    const fetchAnalysis = useCallback(async () => {
        try {
            if (pollCount === 0) setIsLoading(true);
            const decodedId = decodeURIComponent(contractId);
            const data = await getAnalysis(decodedId);

            // Merge response data with cached metadata to avoid UI flickering
            const cachedMetadata = readMetadataCache(decodedId);

            setAnalysis(prev => ({
                ...prev, ...data,
                contractId: data?.contractId || prev?.contractId || decodedId,
                fileName: cachedMetadata?.fileName || data?.fileName || prev?.fileName || '',
                propertyAddress: cachedMetadata?.propertyAddress || data?.propertyAddress || prev?.propertyAddress || '',
                landlordName: cachedMetadata?.landlordName || data?.landlordName || prev?.landlordName || '',
                uploadDate: cachedMetadata?.uploadDate || data?.uploadDate || prev?.uploadDate || '',
            }));
            setError(null);
        } catch (err) {
            const errorMsg = err.message || '';
            // If backend throws 404, analysis isn't ready yet -> trigger next polling cycle
            if (errorMsg.includes('404')) {
                setError({ title: t('analysis.errors.notReadyTitle'), message: `${t('analysis.errors.notReadyMessage')} (${pollCount + 1}/${MAX_POLL_ATTEMPTS})`, type: 'processing' });
            } else if (errorMsg.includes('FAILED') || errorMsg.includes('ValidationException')) {
                setError({ title: t('analysis.errors.failedTitle'), message: t('analysis.errors.failedMessage'), type: 'failed', details: errorMsg });
            } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
                setError({ title: t('analysis.errors.timeoutTitle'), message: t('analysis.errors.timeoutMessage'), type: 'timeout' });
            } else {
                setError({ title: t('analysis.errors.genericTitle'), message: t('analysis.errors.genericMessage'), type: 'error', details: errorMsg });
            }
        } finally {
            setIsLoading(false);
        }
    }, [contractId, pollCount, t]);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

    // Hydrate missing contract metadata from LocalStorage
    // Useful when returning from chat or refreshing the page
    useEffect(() => {
        const resolvedId = analysis?.contractId || contractId;
        if (!resolvedId) return;

        const cachedMetadata = readMetadataCache(resolvedId);
        if (!cachedMetadata) return;

        setAnalysis(prev => {
            if (!prev) {
                return {
                    contractId: resolvedId,
                    ...cachedMetadata,
                };
            }

            return {
                ...prev,
                fileName: cachedMetadata.fileName || prev.fileName,
                propertyAddress: cachedMetadata.propertyAddress || prev.propertyAddress,
                landlordName: cachedMetadata.landlordName || prev.landlordName,
                uploadDate: cachedMetadata.uploadDate || prev.uploadDate,
            };
        });
    }, [analysis?.contractId, contractId]);

    useEffect(() => {
        const currentRouteContractId = contractId || null;
        if (!currentRouteContractId) return;

        // Reset editor snapshots when navigating to a different contract.
        if (hydratedEditsContractRef.current && hydratedEditsContractRef.current !== currentRouteContractId) {
            hydratedEditsContractRef.current = null;
            setEditedClauses({});
            setContractEditState({ editedCount: 0, saveStatus: null });
        }
    }, [contractId]);

    // Restore previously saved edits (if any) sent from backend
    useEffect(() => {
        const resolvedContractId = analysis?.contractId || contractId;
        if (!analysis || !resolvedContractId) return;
        if (hydratedEditsContractRef.current === resolvedContractId) return;

        const normalizedEditedClauses =
            analysis?.editedClauses && typeof analysis.editedClauses === 'object'
                ? analysis.editedClauses
                : {};

        setEditedClauses(normalizedEditedClauses);
        hydratedEditsContractRef.current = resolvedContractId;
    }, [analysis, contractId]);

    // Polling Logic: Continuously check backend if status is 'processing'
    useEffect(() => {
        if (error?.type === 'processing' && pollCount < MAX_POLL_ATTEMPTS && !USE_MOCK) {
            const delay = pollCount === 0 ? INITIAL_DELAY : POLL_INTERVAL;
            const pollTimer = setTimeout(() => {
                setPollCount(prev => prev + 1);
                fetchAnalysis();
            }, delay);
            return () => clearTimeout(pollTimer);
        }
    }, [error, pollCount, USE_MOCK, fetchAnalysis]);

    useEffect(() => { if (analysis) setPollCount(0); }, [analysis]);

    // Saving toast
    useEffect(() => {
        const status = contractEditState.saveStatus || null;
        if (status === prevSaveStatusRef.current) return;
        prevSaveStatusRef.current = status;

        if (status === 'saving') {
            const now = Date.now();
            if (now - lastSavingToastAtRef.current > 1500) {
                emitAppToast({ title: t('analysis.toastSavingTitle'), message: t('analysis.toastSavingMessage'), ttlMs: 1500, type: 'info', icon: '⟳' });
                lastSavingToastAtRef.current = now;
            }
        }
        if (status === 'success') {
            emitAppToast({ title: t('analysis.toastSavedTitle'), message: t('analysis.toastSavedMessage'), type: 'success', icon: '✓' });
        }
        if (status === 'error') {
            emitAppToast({ title: t('analysis.toastSaveFailedTitle'), message: t('analysis.toastSaveFailedMessage'), type: 'error', icon: '⚠' });
        }
    }, [contractEditState.saveStatus, t]);

    // Generator logic: Converts JSON AI response into downloadable Word Document (.docx)
    const handleExportWord = useCallback(async () => {
        setIsExporting(true);
        emitAppToast({ type: 'info', message: t('export.started') });
        try {
            await exportReportToWord(analysis, analysis?.fileName || t('export.defaultFilename'));
            emitAppToast({ type: 'success', message: t('export.success') });
        } catch (error) {
            console.error('Export error:', error);
            emitAppToast({ type: 'error', message: t('export.error') });
        } finally {
            setIsExporting(false);
        }
    }, [analysis, t]);

    const applyMetadataUpdate = useCallback((updatedContract) => {
        if (!updatedContract?.contractId) return;

        persistMetadataCache(updatedContract);

        setAnalysis(prevAnalysis => {
            if (!prevAnalysis) return prevAnalysis;

            const currentContractId = prevAnalysis.contractId || contractId;
            if (currentContractId && currentContractId !== updatedContract.contractId) {
                return prevAnalysis;
            }

            return {
                ...prevAnalysis,
                fileName: updatedContract.fileName,
                propertyAddress: updatedContract.propertyAddress,
                landlordName: updatedContract.landlordName,
            };
        });

        const nextState = {
            ...(location.state || {}),
            contract: {
                ...(location.state?.contract || {}),
                contractId: updatedContract.contractId,
                fileName: updatedContract.fileName,
                propertyAddress: updatedContract.propertyAddress,
                landlordName: updatedContract.landlordName,
            },
        };

        navigate(`${location.pathname}${location.search}${location.hash}`, {
            replace: true,
            state: nextState,
        });
    }, [contractId, location.hash, location.pathname, location.search, location.state, navigate]);

    return {
        // State variables
        contractId,
        analysis,
        isLoading,
        error,
        isExporting,
        isGeneratingShareLink,
        isRevokingShareLink,
        shareLink,
        shareLinkExpiresAt,
        isSharePanelVisible,
        contractEditState,
        setContractEditState,
        _editedClauses,
        setEditedClauses,

        // Refs
        contractViewRef,
        sharePanelRef,

        // Methods
        fetchAnalysis,
        handleExportWord,
        handleCopyShareLink,
        handleManualCopyShareLink,
        handleShareLinkViaApps,
        handleRevokeShareLink,
        handleSaveToCloud,
        applyMetadataUpdate,

        // Translations and Context
        t,
        isRTL,
        userAttributes
    };
};
