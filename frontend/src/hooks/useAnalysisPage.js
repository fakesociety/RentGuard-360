import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getAnalysis, createShareLink, getShareLink, revokeShareLink, saveEditedContract } from '../services/api';
import { exportReportToWord } from '../services/ReportExportService';
import { showAppToast as emitAppToast } from '../utils/toast';
import { useLanguage } from '../contexts/LanguageContext/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export const useAnalysisPage = () => {
    const { contractId } = useParams();
    const { state } = useLocation(); 
    const { t, isRTL } = useLanguage();
    const { userAttributes } = useAuth();
    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

    const [analysis, setAnalysis] = useState(state?.contract || null);
    const [isLoading, setIsLoading] = useState(!state?.contract);
    const [error, setError] = useState(null);
    
    // UI State
    const [activeTab, setActiveTab] = useState('issues');
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exportNotice, setExportNotice] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Export / Share state
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
    const [isSharingLink, setIsSharingLink] = useState(false);
    const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState(null);
    const [isSharePanelVisible, setIsSharePanelVisible] = useState(true);
    const [isShareAccordionOpen, setIsShareAccordionOpen] = useState(false);
    
    // Contract Editor state
    const [contractEditState, setContractEditState] = useState({ editedCount: 0, saveStatus: null });
    const [_editedClauses, setEditedClauses] = useState({});
    
    // Polling state
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_ATTEMPTS = 12; 
    const INITIAL_DELAY = 15000; 
    const POLL_INTERVAL = 10000; 

    const contractViewRef = useRef(null);
    const sharePanelRef = useRef(null);
    const prevSaveStatusRef = useRef(null);
    const lastSavingToastAtRef = useRef(0);
    const hydratedEditsContractRef = useRef(null);

    const showAppToast = useCallback((title, message, options = {}) => {
        const ttlMs = typeof options === 'number' ? options : (options.ttlMs ?? 2600);
        const type = typeof options === 'number' ? 'success' : (options.type ?? 'success');
        const icon = typeof options === 'number' ? undefined : options.icon;

        window.dispatchEvent(new CustomEvent('rg:toast', {
            detail: {
                id: `share-${Date.now()}`,
                title, message, type, icon, createdAt: Date.now(), ttlMs,
            },
        }));
    }, []);

    const showExportNotice = useCallback((message) => {
        setExportNotice(message);
        setTimeout(() => setExportNotice(null), 3000);
    }, []);

    const copyTextToClipboard = useCallback(async (text) => {
        if (!text) return false;
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (clipboardError) {
                console.warn('Async clipboard API failed, using fallback copy.', clipboardError);
            }
        }
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textarea);
            return copied;
        } catch (fallbackError) {
            console.error('Clipboard fallback copy failed', fallbackError);
            return false;
        }
    }, []);

    const getShareCacheKey = useCallback((id) => `rentguard_share_link_${id}`, []);

    const persistShareLink = useCallback((id, url, expiresAt) => {
        if (!id || !url) return;
        try {
            localStorage.setItem(getShareCacheKey(id), JSON.stringify({
                url,
                expiresAt: expiresAt || null,
            }));
        } catch (error) {
            console.warn('Failed to persist share link cache', error);
        }
    }, [getShareCacheKey]);

    const clearShareLinkCache = useCallback((id) => {
        if (!id) return;
        try {
            localStorage.removeItem(getShareCacheKey(id));
        } catch (error) {
            console.warn('Failed to clear share link cache', error);
        }
    }, [getShareCacheKey]);

    const fetchAnalysis = useCallback(async () => {
        try {
            if (pollCount === 0) setIsLoading(true);
            const decodedId = decodeURIComponent(contractId);
            const data = await getAnalysis(decodedId);
            setAnalysis(prev => ({
                ...prev, ...data,
                fileName: data.fileName || prev?.fileName || data.fileName,
                propertyAddress: data.propertyAddress || prev?.propertyAddress || data.propertyAddress,
                landlordName: data.landlordName || prev?.landlordName || data.landlordName,
                uploadDate: data.uploadDate || prev?.uploadDate || data.uploadDate,
            }));
            setError(null);
        } catch (err) {
            const errorMsg = err.message || '';
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

    // Load Share Link
    useEffect(() => {
        const contractForShare = analysis?.contractId || contractId;
        if (!contractForShare) {
            setShareLink(''); setShareLinkExpiresAt(null); setIsSharePanelVisible(false); return;
        }
        let hadCachedLink = false;
        try {
            const cachedRaw = localStorage.getItem(getShareCacheKey(contractForShare));
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                const cachedExpiry = Number(cached?.expiresAt || 0);
                if (cached?.url && (!cachedExpiry || cachedExpiry > (Date.now() / 1000))) {
                    hadCachedLink = true;
                    setShareLink(cached.url);
                    setShareLinkExpiresAt(cached?.expiresAt || null);
                    setIsSharePanelVisible(true);
                } else {
                    clearShareLinkCache(contractForShare);
                }
            }
        } catch (error) { console.warn('Failed to read cache', error); }

        let cancelled = false;
        const loadExistingShareLink = async () => {
            try {
                const shareData = await getShareLink(contractForShare);
                if (cancelled) return;
                if (shareData?.active && shareData?.shareToken) {
                    const url = `${window.location.origin}/#/shared/${encodeURIComponent(shareData.shareToken)}`;
                    setShareLink(url); setShareLinkExpiresAt(shareData?.expiresAt || null); setIsSharePanelVisible(true);
                    persistShareLink(contractForShare, url, shareData?.expiresAt || null);
                } else {
                    setShareLink(''); setShareLinkExpiresAt(null); setIsSharePanelVisible(false); clearShareLinkCache(contractForShare);
                }
            } catch (err) {
                if (cancelled) return;
                if (!hadCachedLink) { setShareLink(''); setShareLinkExpiresAt(null); setIsSharePanelVisible(false); }
            }
        };
        loadExistingShareLink();
        return () => { cancelled = true; };
    }, [analysis?.contractId, clearShareLinkCache, contractId, getShareCacheKey, persistShareLink]);

    // Saving toast
    useEffect(() => {
        const status = contractEditState.saveStatus || null;
        if (status === prevSaveStatusRef.current) return;
        prevSaveStatusRef.current = status;

        if (status === 'saving') {
            const now = Date.now();
            if (now - lastSavingToastAtRef.current > 1500) {
                showAppToast(t('analysis.toastSavingTitle'), t('analysis.toastSavingMessage'), { ttlMs: 1500, type: 'info', icon: '⟳' });
                lastSavingToastAtRef.current = now;
            }
        }
        if (status === 'success') {
            showAppToast(t('analysis.toastSavedTitle'), t('analysis.toastSavedMessage'), { type: 'success', icon: '✓' });
        }
        if (status === 'error') {
            showAppToast(t('analysis.toastSaveFailedTitle'), t('analysis.toastSaveFailedMessage'), { type: 'error', icon: '⚠' });
        }
    }, [contractEditState.saveStatus, showAppToast, t]);

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
            setShowExportMenu(false);
        }
    }, [analysis, t]);

    const focusSharePanel = useCallback(() => {
        setIsSharePanelVisible(true);
        requestAnimationFrame(() => {
            sharePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }, []);

    const handleCopyShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId) {
            showExportNotice(t('analysis.missingShareContractId'));
            return;
        }

        if (shareLink) {
            if (isSharePanelVisible) {
                setIsSharePanelVisible(false);
                showExportNotice(t('analysis.sharePanelHidden'));
            } else {
                focusSharePanel();
                showExportNotice(t('analysis.sharePanelShown'));
            }
            setShowExportMenu(false);
            return;
        }

        setIsGeneratingShareLink(true);
        try {
            const currentPayload = contractViewRef.current?.getCurrentEditedPayload?.();
            if (currentPayload && userAttributes?.sub) {
                await saveEditedContract(shareContractId, userAttributes.sub, currentPayload.editedClauses || {}, currentPayload.fullEditedText || '');
            }
            const shareResult = await createShareLink(shareContractId, 7);
            const token = shareResult?.shareToken;
            if (!token) throw new Error('Missing share token in response');

            const url = `${window.location.origin}/#/shared/${encodeURIComponent(token)}`;
            setShareLink(url);
            setShareLinkExpiresAt(shareResult?.expiresAt || null);
            setIsSharePanelVisible(true);
            persistShareLink(shareContractId, url, shareResult?.expiresAt || null);
            focusSharePanel();
            showExportNotice(t('analysis.shareCreated'));
        } catch (err) {
            console.error('Failed to create share link', err);
            showExportNotice(t('analysis.shareCreateFailed'));
        } finally {
            setIsGeneratingShareLink(false);
            setShowExportMenu(false);
        }
    }, [analysis?.contractId, contractId, focusSharePanel, isSharePanelVisible, persistShareLink, shareLink, showExportNotice, t, userAttributes?.sub]);

    const handleManualCopyShareLink = useCallback(async () => {
        if (!shareLink) return;
        try {
            await copyTextToClipboard(shareLink);
            showAppToast(t('analysis.shareCopiedTitle'), t('analysis.shareCopiedMessage'));
        } catch (err) {
            console.error('Failed to copy share link', err);
            showExportNotice(t('analysis.shareCopyFailed'));
        }
    }, [copyTextToClipboard, shareLink, showAppToast, showExportNotice, t]);

    const handleShareLinkViaApps = useCallback(async () => {
        if (!shareLink) return;
        if (window._isSharingModalOpen) return;
        window._isSharingModalOpen = true;

        const resetLock = () => { setTimeout(() => { window._isSharingModalOpen = false; }, 800); };

        if (!navigator?.share) {
            await handleManualCopyShareLink();
            resetLock();
            return;
        }
        try {
            await navigator.share({
                title: t('analysis.shareNativeTitle') || 'Contract Analysis',
                url: shareLink
            });
            resetLock();
        } catch (err) {
            resetLock();
            if (err?.name !== 'AbortError') {
                console.error('Failed to share link via apps', err);
                await handleManualCopyShareLink();
            }
        }
    }, [handleManualCopyShareLink, shareLink, t]);

    const handleRevokeShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId) {
            showExportNotice(t('analysis.missingShareContractId'));
            return;
        }
        setIsRevokingShareLink(true);
        try {
            await revokeShareLink(shareContractId);
            setShareLink('');
            setShareLinkExpiresAt(null);
            setIsSharePanelVisible(false);
            clearShareLinkCache(shareContractId);
            showAppToast(t('analysis.shareRevokedTitle'), t('analysis.shareRevokedMessage'));
        } catch (err) {
            console.error('Failed to revoke share link', err);
            showExportNotice(t('analysis.shareRevokeFailed'));
        } finally {
            setIsRevokingShareLink(false);
        }
    }, [analysis?.contractId, clearShareLinkCache, contractId, showAppToast, showExportNotice, t]);

    const handleSaveToCloud = useCallback(async (clauses, fullEditedText) => {
        const userId = userAttributes?.sub || 'unknown-user';
        const contractIdClean = analysis?.contractId || contractId;
        await saveEditedContract(contractIdClean, userId, clauses, fullEditedText);
    }, [analysis?.contractId, contractId, userAttributes?.sub]);

    return {
        // State variables
        contractId,
        analysis,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        expandedIssue,
        setExpandedIssue,
        showExportMenu,
        setShowExportMenu,
        exportNotice,
        copiedIndex,
        setCopiedIndex,
        isExporting,
        isGeneratingShareLink,
        isSharingLink,
        isRevokingShareLink,
        shareLink,
        shareLinkExpiresAt,
        isSharePanelVisible,
        isShareAccordionOpen,
        setIsShareAccordionOpen,
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
        copyTextToClipboard,
        showExportNotice,
        showAppToast,
        
        // Translations and Context
        t,
        isRTL,
        userAttributes
    };
};
