/**
 * ============================================
 *  AnalysisPage
 *  Contract Analysis Results Display
 * ============================================
 * 
 * STRUCTURE:
 * - State & Hooks: Analysis data, loading, polling, tabs
 * - API Handlers: fetchAnalysis, consultClause, saveEdits
 * - Export Handlers: Word, PDF, edited contract
 * - Render: Risk score, issues list, contract view
 * 
 * DEPENDENCIES:
 * - api.js: getAnalysis, consultClause, saveEditedContract
 * - ExportService.js: exportToWord, exportToPDF, exportEditedContract
 * - ContractView: Full contract text with edit capability
 * - ScoreBreakdown: Visual score categories
 * 
 * FEATURES:
 * - Auto-polling while analysis is processing
 * - AI-powered clause explanations
 * - Inline contract editing with auto-save
 * - Export to Word/PDF
 * 
 * ============================================
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { createShareLink, getAnalysis, getShareLink, revokeShareLink, saveEditedContract } from '../services/api';
import { exportToWord, exportToPDF, exportEditedContract } from '../services/ExportService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ScoreMethodology from '../components/ScoreMethodology';
import ContractView from '../components/ContractView';
import ActionMenu from '../components/ActionMenu';
import {
    FileText,
    Scale,
    Lightbulb,
    CheckCircle,
    Copy,
    Check,
    MessageCircle,
    Share2,
    Eraser,
    Trash2,
    ExternalLink,
    MapPin,
    UserRound,
    CalendarDays,
    ScrollText,
    AlertTriangle,
    ShieldCheck,
    Hourglass,
    Timer,
    XCircle,
    AlertCircle,
    ChevronDown,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import './AnalysisPage.css';
import './LegalCard.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
    const { state } = useLocation(); // Get passed state from navigation
    const { t, isRTL } = useLanguage();
    const { userAttributes } = useAuth();

    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

    // Initialize with passed contract data if available (instant load)
    const [analysis, setAnalysis] = useState(state?.contract || null);
    const [isLoading, setIsLoading] = useState(!state?.contract); // Only show loading if no data passed
    const [error, setError] = useState(null);
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
    const [isSharingLink, setIsSharingLink] = useState(false);
    const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState(null);
    const [isSharePanelVisible, setIsSharePanelVisible] = useState(true);
    const [exportNotice, setExportNotice] = useState(null);
    const [activeTab, setActiveTab] = useState('issues'); // 'issues' or 'contract'
    const [_editedClauses, setEditedClauses] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_ATTEMPTS = 12; // 12 attempts = ~2 minutes total
    const INITIAL_DELAY = 15000; // Wait 15s before first poll (analysis takes 30-60s)
    const POLL_INTERVAL = 10000; // Then poll every 10 seconds

    // ContractView ref and edit state (for the export section)
    const contractViewRef = useRef(null);
    const sharePanelRef = useRef(null);
    const prevSaveStatusRef = useRef(null);
    const lastSavingToastAtRef = useRef(0);
    const [contractEditState, setContractEditState] = useState({ editedCount: 0, saveStatus: null });

    const focusSharePanel = useCallback(() => {
        setActiveTab('contract');
        setIsSharePanelVisible(true);
        requestAnimationFrame(() => {
            sharePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
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

    const getShareButtonLabel = useCallback(() => {
        if (isGeneratingShareLink) {
            return t('analysis.shareButtonCreating');
        }
        if (shareLink && isSharePanelVisible) {
            return t('analysis.shareButtonHide');
        }
        if (shareLink && !isSharePanelVisible) {
            return t('analysis.shareButtonShow');
        }
        return t('analysis.shareButtonCreate');
    }, [isGeneratingShareLink, isSharePanelVisible, shareLink, t]);

    const showExportNotice = useCallback((message) => {
        setExportNotice(message);
        setTimeout(() => setExportNotice(null), 3000);
    }, []);

    const showAppToast = useCallback((title, message, options = {}) => {
        const ttlMs = typeof options === 'number' ? options : (options.ttlMs ?? 2600);
        const type = typeof options === 'number' ? 'success' : (options.type ?? 'success');
        const icon = typeof options === 'number' ? undefined : options.icon;

        window.dispatchEvent(new CustomEvent('rg:toast', {
            detail: {
                id: `share-${Date.now()}`,
                title,
                message,
                type,
                icon,
                createdAt: Date.now(),
                ttlMs,
            },
        }));
    }, []);

    useEffect(() => {
        const status = contractEditState.saveStatus || null;
        if (status === prevSaveStatusRef.current) return;
        prevSaveStatusRef.current = status;

        if (status === 'saving') {
            const now = Date.now();
            // Avoid flooding toasts on very frequent autosave cycles.
            if (now - lastSavingToastAtRef.current > 1500) {
                showAppToast(
                    t('analysis.toastSavingTitle'),
                    t('analysis.toastSavingMessage'),
                    { ttlMs: 1500, type: 'info', icon: '⟳' }
                );
                lastSavingToastAtRef.current = now;
            }
        }

        if (status === 'success') {
            showAppToast(
                t('analysis.toastSavedTitle'),
                t('analysis.toastSavedMessage'),
                { type: 'success', icon: '✓' }
            );
        }

        if (status === 'error') {
            showAppToast(
                t('analysis.toastSaveFailedTitle'),
                t('analysis.toastSaveFailedMessage'),
                { type: 'error', icon: '⚠' }
            );
        }
    }, [contractEditState.saveStatus, showAppToast, t]);

    const copyTextToClipboard = useCallback(async (text) => {
        if (!text) return false;

        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

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
    }, []);

    const handleExportWord = useCallback(async () => {
        setIsExporting(true);
        try {
            await exportToWord(analysis, analysis?.fileName || t('analysis.defaultReportName'));
            showExportNotice(t('analysis.exportWordStarted'));
        } finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    }, [analysis, showExportNotice, t]);

    const handleExportPdf = useCallback(async () => {
        setIsExporting(true);
        try {
            await exportToPDF(analysis, analysis?.fileName || t('analysis.defaultReportName'));
            showExportNotice(t('analysis.exportPdfStarted'));
        } finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    }, [analysis, showExportNotice, t]);

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
                await saveEditedContract(
                    shareContractId,
                    userAttributes.sub,
                    currentPayload.editedClauses || {},
                    currentPayload.fullEditedText || ''
                );
            }

            const shareResult = await createShareLink(shareContractId, 7);
            const token = shareResult?.shareToken;
            if (!token) {
                throw new Error('Missing share token in response');
            }

            const url = `${window.location.origin}/shared/${encodeURIComponent(token)}`;
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
            showAppToast(
                t('analysis.shareCopiedTitle'),
                t('analysis.shareCopiedMessage')
            );
        } catch (err) {
            console.error('Failed to copy share link', err);
            showExportNotice(t('analysis.shareCopyFailed'));
        }
    }, [copyTextToClipboard, shareLink, showAppToast, showExportNotice, t]);

    const handleShareLinkViaApps = useCallback(async () => {
        if (!shareLink) return;

        if (!navigator?.share) {
            await handleManualCopyShareLink();
            return;
        }

        setIsSharingLink(true);
        try {
            await navigator.share({
                title: t('analysis.shareNativeTitle'),
                text: t('analysis.shareNativeText'),
                url: shareLink,
            });
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('Failed to share link via apps', err);
                showExportNotice(t('analysis.shareFailed'));
            }
        } finally {
            setIsSharingLink(false);
        }
    }, [handleManualCopyShareLink, shareLink, showExportNotice, t]);

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
            showAppToast(
                t('analysis.shareRevokedTitle'),
                t('analysis.shareRevokedMessage')
            );
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

    const fetchAnalysis = useCallback(async () => {
        try {
            if (pollCount === 0) {
                setIsLoading(true);
            }

            const decodedId = decodeURIComponent(contractId);
            console.log('Fetching analysis for:', decodedId);
            const data = await getAnalysis(decodedId);
            setAnalysis(prev => ({
                ...prev, 
                ...data, 
                fileName: data.fileName || prev?.fileName || data.fileName,
                propertyAddress: data.propertyAddress || prev?.propertyAddress || data.propertyAddress,
                landlordName: data.landlordName || prev?.landlordName || data.landlordName,
                uploadDate: data.uploadDate || prev?.uploadDate || data.uploadDate,
            }));
            setError(null); 
        } catch (err) {
            console.error('Failed to fetch analysis:', err);
            const errorMsg = err.message || '';

            if (errorMsg.includes('404')) {
                setError({
                    title: t('analysis.errors.notReadyTitle'),
                    message: `${t('analysis.errors.notReadyMessage')} (${pollCount + 1}/${MAX_POLL_ATTEMPTS})`,
                    type: 'processing'
                });
            } else if (errorMsg.includes('FAILED') || errorMsg.includes('ValidationException')) {
                setError({
                    title: t('analysis.errors.failedTitle'),
                    message: t('analysis.errors.failedMessage'),
                    type: 'failed',
                    details: errorMsg
                });
            } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
                setError({
                    title: t('analysis.errors.timeoutTitle'),
                    message: t('analysis.errors.timeoutMessage'),
                    type: 'timeout'
                });
            } else {
                setError({
                    title: t('analysis.errors.genericTitle'),
                    message: t('analysis.errors.genericMessage'),
                    type: 'error',
                    details: errorMsg
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [contractId, pollCount, t]);

    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    useEffect(() => {
        if (error?.type === 'processing' && pollCount < MAX_POLL_ATTEMPTS && !USE_MOCK) {
            const delay = pollCount === 0 ? INITIAL_DELAY : POLL_INTERVAL;
            console.log(`Auto-polling in ${delay / 1000}s... (attempt ${pollCount + 1}/${MAX_POLL_ATTEMPTS})`);

            const pollTimer = setTimeout(() => {
                setPollCount(prev => prev + 1);
                fetchAnalysis();
            }, delay);

            return () => clearTimeout(pollTimer);
        }
    }, [error, pollCount, USE_MOCK, fetchAnalysis]);

    useEffect(() => {
        if (analysis) {
            setPollCount(0);
        }
    }, [analysis]);

    useEffect(() => {
        const contractForShare = analysis?.contractId || contractId;
        if (!contractForShare) {
            setShareLink('');
            setShareLinkExpiresAt(null);
            setIsSharePanelVisible(false);
            return;
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
        } catch (error) {
            console.warn('Failed to read share link cache', error);
        }

        let cancelled = false;

        const loadExistingShareLink = async () => {
            try {
                const shareData = await getShareLink(contractForShare);
                if (cancelled) return;

                if (shareData?.active && shareData?.shareToken) {
                    const url = `${window.location.origin}/shared/${encodeURIComponent(shareData.shareToken)}`;
                    setShareLink(url);
                    setShareLinkExpiresAt(shareData?.expiresAt || null);
                    setIsSharePanelVisible(true);
                    persistShareLink(contractForShare, url, shareData?.expiresAt || null);
                } else {
                    setShareLink('');
                    setShareLinkExpiresAt(null);
                    setIsSharePanelVisible(false);
                    clearShareLinkCache(contractForShare);
                }
            } catch (err) {
                if (cancelled) return;
                console.warn('No active share link found', err);
                if (!hadCachedLink) {
                    setShareLink('');
                    setShareLinkExpiresAt(null);
                    setIsSharePanelVisible(false);
                }
            }
        };

        loadExistingShareLink();

        return () => {
            cancelled = true;
        };
    }, [analysis?.contractId, clearShareLinkCache, contractId, getShareCacheKey, persistShareLink]);

    const getShareExpiryLabel = useCallback(() => {
        if (!shareLinkExpiresAt) {
            return t('analysis.shareExpiryDefault');
        }

        const secondsLeft = Math.floor(shareLinkExpiresAt - (Date.now() / 1000));
        if (secondsLeft <= 0) {
            return t('analysis.shareExpiryExpired');
        }

        const daysLeft = Math.ceil(secondsLeft / 86400);
        if (isRTL) {
            return t('analysis.shareExpiryDays').replace('{days}', String(daysLeft));
        }
        if (daysLeft === 1) {
            return t('analysis.shareExpiryDaysOne');
        }
        return t('analysis.shareExpiryDaysMany').replace('{days}', String(daysLeft));
    }, [isRTL, shareLinkExpiresAt, t]);

    const getRiskLabel = (level) => {
        const labels = { High: 'high', Medium: 'medium', Low: 'low' };
        return labels[level] || 'medium';
    };

    if (isLoading) {
        return (
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>{t('analysis.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        // Replaced emojis with Lucide Icons for error states
        let ErrorIconComponent;
        switch (error.type) {
            case 'processing':
                ErrorIconComponent = <Hourglass className="error-icon" size={48} />;
                break;
            case 'timeout':
                ErrorIconComponent = <Timer className="error-icon" size={48} />;
                break;
            case 'failed':
                ErrorIconComponent = <XCircle className="error-icon" size={48} />;
                break;
            default:
                ErrorIconComponent = <AlertCircle className="error-icon" size={48} />;
        }

        return (
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`error-state error-${error.type}`}>
                    {ErrorIconComponent}
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="error-details">
                            <summary>{t('analysis.technicalDetails')}</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>{t('analysis.tryAgain')}</Button>
                        <Link to="/contracts">
                            <Button variant="secondary">{t('analysis.backToContracts')}</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const result = analysis?.analysis_result || analysis;
    const riskScore = result?.overall_risk_score || 0;
    const issues = result?.issues || [];
    const scoreBreakdown = result?.score_breakdown || {};

    return (
        <>
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                
                {/* 1. Header Row */}
                <div className="analysis-header animate-fadeIn no-print">
                    <h1>{t('analysis.title')}</h1>
                    <Link to="/contracts" className="back-button-premium">
                        {t('analysis.backToContracts')}
                        {isRTL ? <ArrowLeft className="arrow" size={20} /> : <ArrowRight className="arrow" size={20} />}
                    </Link>
                </div>

                <div className="analysis-layout">
                    {/* Sticky Sidebar - Left */}
                    <aside className="analysis-sidebar no-print">
                        <Card variant="glass" padding="md" className="sidebar-card">
                            {/* Contract Brand Card - Premium Design */}
                            <div className="contract-hero-card animate-slideIn">
                                <div className="contract-card-header">
                                    <div className="contract-icon-wrapper">
                                        <FileText size={22} className="contract-icon-main" strokeWidth={1.9} />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <h3 className="contract-hero-title">
                                        {analysis?.fileName || t('analysis.contractDocument')}
                                    </h3>
                                </div>

                                <div className="contract-hero-meta">
                                    {analysis?.propertyAddress && (
                                        <div className="meta-block">
                                            <span className="meta-label">
                                                <MapPin size={13} strokeWidth={2} />
                                                <span>{t('contracts.propertyAddress')}</span>
                                            </span>
                                            <span className="meta-value address-value">{analysis.propertyAddress}</span>
                                        </div>
                                    )}
                                    <div className="meta-row">
                                        {analysis?.landlordName && (
                                            <div className="meta-block half-width">
                                                <span className="meta-label">
                                                    <UserRound size={13} strokeWidth={2} />
                                                    <span>{t('contracts.landlordName')}</span>
                                                </span>
                                                <span className="meta-value">{analysis.landlordName}</span>
                                            </div>
                                        )}
                                        {analysis?.uploadDate && (
                                            <div className="meta-block half-width">
                                                <span className="meta-label">
                                                    <CalendarDays size={13} strokeWidth={2} />
                                                    <span>{t('contracts.uploadDate')}</span>
                                                </span>
                                                <span className="meta-value">
                                                    {new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="sidebar-divider"></div>

                            {/* Summary - Prominent */}
                            <div className="sidebar-summary-hero">
                                <h4 className="summary-title">
                                    <ScrollText size={16} strokeWidth={2} />
                                    <span>{t('analysis.summary')}</span>
                                </h4>
                                <p>{result?.summary || t('analysis.analysisComplete')}</p>
                                {result?.is_contract === false && (
                                    <div className="not-contract-warning">
                                        <AlertTriangle size={15} strokeWidth={2} />
                                        <span>{t('analysis.notContract')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="sidebar-divider"></div>

                            {/* Score Section */}
                            <ScoreBreakdown
                                overallScore={riskScore}
                                breakdown={scoreBreakdown}
                                issues={issues}
                            />

                            {/* Score Methodology Explanation */}
                            <ScoreMethodology />

                            <div className="sidebar-divider"></div>

                            {/* Actions */}
                            <div className="sidebar-actions">
                                <button className="sidebar-action-btn" onClick={fetchAnalysis}>
                                    {t('analysis.refresh')}
                                </button>
                                <ActionMenu
                                    isOpen={showExportMenu}
                                    onToggle={() => setShowExportMenu(!showExportMenu)}
                                    onClose={() => setShowExportMenu(false)}
                                    containerClassName="export-dropdown-sidebar"
                                    triggerClassName="sidebar-action-btn"
                                    triggerContent={`${t('analysis.export')} ${showExportMenu ? '▲' : '▼'}`}
                                    panelClassName="export-menu-sidebar"
                                >
                                    <div className="export-menu-title">{t('analysis.exportMenuTitle')}</div>
                                    <div className="export-menu-group-title">{t('analysis.exportMenuDownload')}</div>
                                    <button onClick={handleExportWord} disabled={isExporting}>
                                        {t('analysis.exportMenuWordTitle')}
                                        <span className="export-note">{t('analysis.exportMenuWordNote')}</span>
                                    </button>
                                    <button onClick={handleExportPdf} disabled={isExporting}>
                                        {t('analysis.exportMenuPdfTitle')}
                                        <span className="export-note">{t('analysis.exportMenuPdfNote')}</span>
                                    </button>
                                    <div className="export-menu-group-title">{t('analysis.exportMenuShare')}</div>
                                    <button onClick={handleCopyShareLink} disabled={isGeneratingShareLink}>
                                        <Share2 size={16} style={{ marginInlineEnd: '6px' }} />
                                        {getShareButtonLabel()}
                                    </button>
                                </ActionMenu>
                            </div>
                            {exportNotice && (
                                <div className="export-feedback-note" role="status">
                                    {exportNotice}
                                </div>
                            )}
                        </Card>
                    </aside>

                    {/* Main Content - Right */}
                    <main className="analysis-main">

                        {/* Tab Navigation */}
                        <div className="analysis-tabs no-print">
                            <button
                                className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
                                onClick={() => setActiveTab('issues')}
                            >
                                {t('analysis.issues')} ({issues.length})
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
                                onClick={() => setActiveTab('contract')}
                            >
                                {t('analysis.fullContractTab')}
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'issues' && issues.length > 0 && (
                            <section className="issues-section" dir={isRTL ? 'rtl' : 'ltr'}>
                                <h2 className="section-title-hebrew">
                                    {t('analysis.issues')} ({issues.length})
                                </h2>
                                <div className="issues-list">
                                    {issues.map((issue, index) => {
                                        const handleCopy = async (text, idx) => {
                                            try {
                                                await navigator.clipboard.writeText(text);
                                                setCopiedIndex(idx);
                                                setTimeout(() => setCopiedIndex(null), 2000);
                                            } catch (err) {
                                                console.error('Failed to copy:', err);
                                            }
                                        };

                                        const riskClass = getRiskLabel(issue.risk_level);

                                        return (
                                            <div
                                                key={index}
                                                className={`legal-card ${riskClass} animate-slideUp`}
                                                style={{ animationDelay: `${index * 80}ms` }}
                                            >
                                                {/* Severity Indicator Glow */}
                                                <div className={`severity-glow ${riskClass}`}></div>

                                                {/* Card Header */}
                                                <div
                                                    className="legal-card-header"
                                                    onClick={() => setExpandedIssue(expandedIssue === index ? null : index)}
                                                >
                                                    <div className="legal-header-main">
                                                        <h3 className="legal-title">{issue.clause_topic}</h3>
                                                        <div className="legal-meta">
                                                            {/* Risk Badge - Pill with dot */}
                                                            <span className={`risk-pill ${riskClass}`}>
                                                                <span className="risk-dot"></span>
                                                                {issue.risk_level === 'High' && t('score.highRisk')}
                                                                {issue.risk_level === 'Medium' && t('score.mediumRisk')}
                                                                {issue.risk_level === 'Low' && t('score.lowRisk')}
                                                            </span>
                                                            {issue.penalty_points && (
                                                                <span className="points-badge">
                                                                    -{issue.penalty_points} {t('analysis.points')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button className={`expand-trigger ${expandedIssue === index ? 'expanded' : ''}`}>
                                                        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
                                                    </button>
                                                </div>

                                                {/* Card Content */}
                                                <div className={`legal-card-content ${expandedIssue === index ? 'expanded' : ''}`}>

                                                    {/* Original Clause - Quote Style */}
                                                    {issue.original_text && (
                                                        <div className="legal-section quote-section">
                                                            <div className="section-icon">
                                                                <FileText size={18} />
                                                            </div>
                                                            <div className="section-body">
                                                                <h4 className="section-label">{t('analysis.originalClause')}</h4>
                                                                <blockquote className="original-quote">
                                                                    "{issue.original_text}"
                                                                </blockquote>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Legal Basis - Compact */}
                                                    {issue.legal_basis && (
                                                        <div className="legal-section compact-section">
                                                            <div className="section-icon legal-icon">
                                                                <Scale size={18} />
                                                            </div>
                                                            <div className="section-body">
                                                                <h4 className="section-label">{t('analysis.legalBasis')}</h4>
                                                                <p className="legal-basis-text">{issue.legal_basis}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Why It Matters - Explanation */}
                                                    <div className="legal-section explanation-section">
                                                        <div className="section-icon explanation-icon">
                                                            <Lightbulb size={18} />
                                                        </div>
                                                        <div className="section-body">
                                                            <h4 className="section-label">{t('analysis.whyItMatters')}</h4>
                                                            <p className="explanation-text">{issue.explanation}</p>
                                                        </div>
                                                    </div>

                                                    {/* Recommendation - Highlighted */}
                                                    {issue.suggested_fix && (
                                                        <div className="legal-section recommendation-section">
                                                            <div className="section-icon recommendation-icon">
                                                                <CheckCircle size={18} />
                                                            </div>
                                                            <div className="section-body">
                                                                <h4 className="section-label">{t('analysis.recommendedClause')}</h4>
                                                                <div className="recommendation-box">
                                                                    <p className="recommendation-text">{issue.suggested_fix}</p>
                                                                    <button
                                                                        className={`copy-button ${copiedIndex === index ? 'copied' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCopy(issue.suggested_fix, index);
                                                                        }}
                                                                    >
                                                                        {copiedIndex === index ? (
                                                                            <>
                                                                                <Check size={16} />
                                                                                <span>{t('analysis.copied')}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy size={16} />
                                                                                <span>{t('analysis.copyFix')}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Negotiation Tip - Removed Emoji */}
                                                    {issue.negotiation_tip && (
                                                        <div className="legal-section tip-section">
                                                            <div className="section-icon tip-icon">
                                                                <MessageCircle size={18} />
                                                            </div>
                                                            <div className="section-body">
                                                                <h4 className="section-label tip-label">{t('analysis.negotiationTip')}</h4>
                                                                <p className="tip-text">{issue.negotiation_tip}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {activeTab === 'issues' && issues.length === 0 && (
                            <Card variant="glass" padding="lg" className={`no-issues animate-slideUp ${result?.is_contract === false ? 'not-contract' : ''}`}>
                                <div className="no-issues-content">
                                    {result?.is_contract === false ? (
                                        <>
                                            <span className="no-issues-icon warning" aria-hidden="true">
                                                <AlertTriangle size={40} strokeWidth={2} />
                                            </span>
                                            <h3>{t('analysis.notRentalTitle')}</h3>
                                            <p>{t('analysis.notRentalDescription')}</p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="no-issues-icon" aria-hidden="true">
                                                <ShieldCheck size={40} strokeWidth={2} />
                                            </span>
                                            <h3>{t('analysis.noIssues')}</h3>
                                            <p>{t('analysis.noIssuesDescription')}</p>
                                        </>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Full Contract View Tab */}
                        {activeTab === 'contract' && (
                            <section className="contract-scroll-section" dir={isRTL ? 'rtl' : 'ltr'}>
                                {result?.is_contract === false ? (
                                    <Card variant="glass" padding="lg" className="not-contract-fullview animate-slideUp">
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '3rem 2rem',
                                            textAlign: 'center'
                                        }}>
                                            <AlertTriangle size={48} className="text-yellow-500" style={{ marginBottom: '1rem', color: 'var(--warning-color)' }} />
                                            <h3 style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 'bold',
                                                color: 'var(--warning-color)',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {t('analysis.notRentalTitle')}
                                            </h3>
                                            <p style={{
                                                fontSize: '1rem',
                                                color: 'var(--text-secondary)',
                                                maxWidth: '450px',
                                                lineHeight: '1.6'
                                            }}>
                                                {t('analysis.notRentalContentDescription')}
                                            </p>
                                        </div>
                                    </Card>
                                ) : (
                                    <ContractView
                                        ref={contractViewRef}
                                        contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                                        backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                                        issues={issues}
                                        contractId={analysis?.contractId || contractId}
                                        onClauseChange={(clauseId, text, action) => {
                                            setEditedClauses(prev => ({
                                                ...prev,
                                                [clauseId]: { text, action }
                                            }));
                                        }}
                                        onExportEdited={async (editedClausesMap) => {
                                            const contractText = analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || '';
                                            const backendClauses = analysis?.clauses_list || analysis?.clauses || [];
                                            await exportEditedContract(contractText, editedClausesMap, issues, 'Edited_Contract', backendClauses);
                                        }}
                                        onSaveToCloud={handleSaveToCloud}
                                        onEditStateChange={setContractEditState}
                                    />
                                )}
                            </section>
                        )}

                        {/* Export Section - Always visible when contract tab is active */}
                        {activeTab === 'contract' && result?.is_contract !== false && (
                            <div className="contract-export-bar no-print">
                                <div className="export-actions-row">
                                    <button className="export-btn-main" onClick={() => contractViewRef.current?.handleExport()}>
                                        <span className="export-btn-label">{t('analysis.exportEditedWord')}</span>
                                    </button>
                                    <button
                                        className="export-btn-main"
                                        style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)' }}
                                        onClick={handleCopyShareLink}
                                        disabled={isGeneratingShareLink}
                                    >
                                        <Share2 size={16} style={{ marginInlineEnd: '6px' }} />
                                        <span className="export-btn-label">
                                            {getShareButtonLabel()}
                                        </span>
                                    </button>

                                    <div className={`reset-btn-wrapper ${contractEditState.editedCount > 0 ? 'show' : ''}`}>
                                        <button
                                            className="export-btn-secondary"
                                            title={t('analysis.resetEditsTitle')}
                                            onClick={() => contractViewRef.current?.requestClearAll()}
                                        >
                                            <Eraser size={15} aria-hidden="true" />
                                            <span>{t('analysis.resetEdits')}</span>
                                            <span className="export-btn-counter">{contractEditState.editedCount}</span>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}

                        {activeTab === 'contract' && result?.is_contract !== false && shareLink && isSharePanelVisible && (
                            <div ref={sharePanelRef} className="share-link-panel no-print">
                                <div className="share-link-panel-header">
                                    <div className="share-link-title">{t('analysis.secureShareLink')}</div>
                                    <div className="share-link-expiry">{getShareExpiryLabel()}</div>
                                </div>

                                <div className="share-link-input-wrap">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareLink}
                                        className="share-link-input"
                                        onFocus={(e) => e.target.select()}
                                        aria-label={t('analysis.shareLinkAria')}
                                    />
                                </div>

                                <div className="share-link-actions">
                                    <button className="share-link-btn primary" onClick={handleManualCopyShareLink}>
                                        <Copy size={15} />
                                        <span>{t('analysis.copyLink')}</span>
                                    </button>
                                    <button
                                        className="share-link-btn"
                                        onClick={handleShareLinkViaApps}
                                        disabled={isSharingLink || isRevokingShareLink}
                                    >
                                        <Share2 size={15} />
                                        <span>
                                            {isSharingLink
                                                ? t('analysis.sharing')
                                                : t('analysis.shareViaApps')}
                                        </span>
                                    </button>
                                    <a
                                        className="share-link-btn"
                                        href={shareLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink size={15} />
                                        <span>{t('analysis.openLink')}</span>
                                    </a>
                                    <button
                                        className="share-link-btn revoke share-link-btn-end"
                                        onClick={handleRevokeShareLink}
                                        disabled={isRevokingShareLink || isGeneratingShareLink}
                                    >
                                        <Trash2 size={15} />
                                        <span>
                                            {isRevokingShareLink
                                                ? t('analysis.revoking')
                                                : t('analysis.revokeLink')}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default AnalysisPage;