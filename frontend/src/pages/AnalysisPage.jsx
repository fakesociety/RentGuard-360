/**
 * ============================================
 * AnalysisPage
 * Contract Analysis Results Display (LexisFlow Modern UI)
 * ============================================
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { createShareLink, getAnalysis, getShareLink, revokeShareLink, saveEditedContract } from '../services/api';
import { exportToWord, exportToPDF, exportEditedContract } from '../services/ExportService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ScoreMethodology from '../components/ScoreMethodology';
import ContractView from '../components/ContractView';
import ActionMenu from '../components/ActionMenu';
import {
    FileText,
    FileDown,
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
    RefreshCw,
    ArrowRight,
    ArrowLeft,
    MoreVertical,
    Wand2,
    Gavel
} from 'lucide-react';
import './AnalysisPage.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
    const { state } = useLocation(); 
    const { t, isRTL } = useLanguage();
    const { userAttributes } = useAuth();

    const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

    const [analysis, setAnalysis] = useState(state?.contract || null);
    const [isLoading, setIsLoading] = useState(!state?.contract);
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
    const [isShareAccordionOpen, setIsShareAccordionOpen] = useState(false);
    const [exportNotice, setExportNotice] = useState(null);
    const [activeTab, setActiveTab] = useState('issues'); 
    const [_editedClauses, setEditedClauses] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_ATTEMPTS = 12; 
    const INITIAL_DELAY = 15000; 
    const POLL_INTERVAL = 10000; 

    const contractViewRef = useRef(null);
    const sharePanelRef = useRef(null);
    const prevSaveStatusRef = useRef(null);
    const lastSavingToastAtRef = useRef(0);
    const [contractEditState, setContractEditState] = useState({ editedCount: 0, saveStatus: null });

    const focusSharePanel = useCallback(() => {
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
        if (isGeneratingShareLink) return t('analysis.shareButtonCreating');
        if (shareLink && isSharePanelVisible) return t('analysis.shareButtonHide');
        if (shareLink && !isSharePanelVisible) return t('analysis.shareButtonShow');
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
                title, message, type, icon, createdAt: Date.now(), ttlMs,
            },
        }));
    }, []);

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

    const copyTextToClipboard = useCallback(async (text) => {
        if (!text) return false;
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (clipboardError) {
                // Fall back when browser denies async clipboard permissions.
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
                await saveEditedContract(shareContractId, userAttributes.sub, currentPayload.editedClauses || {}, currentPayload.fullEditedText || '');
            }
            const shareResult = await createShareLink(shareContractId, 7);
            const token = shareResult?.shareToken;
            if (!token) throw new Error('Missing share token in response');

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
            showAppToast(t('analysis.shareCopiedTitle'), t('analysis.shareCopiedMessage'));
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
            await navigator.share({ title: t('analysis.shareNativeTitle'), text: t('analysis.shareNativeText'), url: shareLink });
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
                    const url = `${window.location.origin}/shared/${encodeURIComponent(shareData.shareToken)}`;
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

    const getShareExpiryLabel = useCallback(() => {
        if (!shareLinkExpiresAt) return t('analysis.shareExpiryDefault');
        const secondsLeft = Math.floor(shareLinkExpiresAt - (Date.now() / 1000));
        if (secondsLeft <= 0) return t('analysis.shareExpiryExpired');
        const daysLeft = Math.ceil(secondsLeft / 86400);
        if (isRTL) return t('analysis.shareExpiryDays').replace('{days}', String(daysLeft));
        if (daysLeft === 1) return t('analysis.shareExpiryDaysOne');
        return t('analysis.shareExpiryDaysMany').replace('{days}', String(daysLeft));
    }, [isRTL, shareLinkExpiresAt, t]);

    const getRiskLabel = (level) => {
        const labels = { High: 'high', Medium: 'medium', Low: 'low' };
        return labels[level] || 'medium';
    };

    const getHealthTier = (score) => {
        if (score >= 86) return 'health-excellent';
        if (score >= 71) return 'health-good';
        if (score >= 51) return 'health-warning';
        return 'health-danger';
    };

    const pickInlineText = (...candidates) => {
        for (const value of candidates) {
            if (value === null || value === undefined) continue;
            const text = String(value).replace(/\s+/g, ' ').trim();
            if (text) return text;
        }
        return '';
    };

    const pickBlockText = (...candidates) => {
        for (const value of candidates) {
            if (value === null || value === undefined) continue;
            const text = String(value).trim();
            if (text) return text;
        }
        return '';
    };

    // ===================== RENDER HELPERS =====================
    
    if (isLoading) {
        return (
            <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="lf-loading-state">
                    <div className="lf-spinner"></div>
                    <p>{t('analysis.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        let ErrorIconComponent;
        switch (error.type) {
            case 'processing': ErrorIconComponent = <Hourglass className="lf-error-icon" size={48} />; break;
            case 'timeout': ErrorIconComponent = <Timer className="lf-error-icon" size={48} />; break;
            case 'failed': ErrorIconComponent = <XCircle className="lf-error-icon" size={48} />; break;
            default: ErrorIconComponent = <AlertCircle className="lf-error-icon" size={48} />;
        }
        return (
            <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`lf-error-box error-${error.type}`}>
                    {ErrorIconComponent}
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="lf-error-details">
                            <summary>{t('analysis.technicalDetails')}</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="lf-error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>{t('analysis.tryAgain')}</Button>
                        <Link to="/contracts"><Button variant="secondary">{t('analysis.backToContracts')}</Button></Link>
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
        <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* 1. Global Header & Tabs */}
            <header className="lf-header no-print">
                <div className="lf-header-content">
                    <div className="lf-header-text">
                        <span className="lf-pre-title">{t('analysis.title')}</span>
                        <h1 className="lf-main-title">{analysis?.fileName || t('analysis.contractDocument')}</h1>
                        <p className="lf-subtitle">{result?.summary || t('analysis.analysisComplete')}</p>
                    </div>
                    <div className="lf-header-actions">
                        <Link to="/contracts" className="lf-btn-back">
                            {isRTL ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                            {t('analysis.backToContracts')}
                        </Link>
                    </div>
                </div>

                <div className="lf-tabs-container">
                    <div className="lf-tabs-pill">
                        <button 
                            className={`lf-tab-btn ${activeTab === 'issues' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('issues')}
                        >
                            {t('analysis.issues')} ({issues.length})
                        </button>
                        <button 
                            className={`lf-tab-btn ${activeTab === 'contract' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('contract')}
                        >
                            {t('analysis.fullContractTab')}
                        </button>
                    </div>
                </div>
            </header>

            {/* 3. Main Layout Container */}
            <div className="lf-main-container">
                
                {/* BENTO GRID (Visible only in Issues tab) */}
                {activeTab === 'issues' && (
                    <div className="lf-bento-grid no-print">
                        
                        {/* Main Score Card */}
                        <div className={`lf-bento-score ${getHealthTier(riskScore)}`}>
                            <div className="lf-score-bg-glow"></div>
                            <div className="lf-score-header">
                                <span className="lf-score-label">{t('analysis.aggregateIntelligence')}</span>
                                <h2>{t('analysis.overallHealth')}</h2>
                            </div>
                            <div className="lf-score-body">
                                <span className="lf-score-big">{riskScore}</span>
                                <span className="lf-score-small">/100</span>
                            </div>
                            <div className="lf-score-footer">
                                <div className="lf-progress-track">
                                    <div className="lf-progress-fill" style={{ width: `${riskScore}%` }}></div>
                                </div>
                                <p>{t('analysis.overallRiskScore')}</p>
                            </div>
                        </div>

                        {/* Secondary Tiles */}
                        <div className="lf-bento-tiles">
                            
                            {/* Quick Actions (Fixed Layout) */}
                            <div className="lf-tile lf-tile-glass lf-quick-actions-tile">
                                <h3>{t('analysis.quickActions')}</h3>
                                <div className="lf-quick-actions-grid">
                                    <button className="lf-action-btn" onClick={fetchAnalysis}>
                                        <RefreshCw size={16} />
                                        <span>{t('analysis.refresh')}</span>
                                    </button>
                                    <ActionMenu
                                        isOpen={showExportMenu}
                                        onToggle={() => setShowExportMenu(!showExportMenu)}
                                        onClose={() => setShowExportMenu(false)}
                                        containerClassName="lf-export-dropdown"
                                        triggerClassName="lf-action-btn"
                                        triggerContent={
                                            <>
                                                <FileDown size={16} />
                                                <span>{t('analysis.export')}</span>
                                                <ChevronDown size={14} />
                                            </>
                                        }
                                        panelClassName="lf-export-menu"
                                    >
                                        <div className="export-menu-group-title">{t('analysis.exportMenuDownload')}</div>
                                        <button onClick={handleExportWord} disabled={isExporting}>
                                            <FileText size={14} />
                                            <span>{t('analysis.exportMenuWordTitle')}</span>
                                        </button>
                                        <button onClick={handleExportPdf} disabled={isExporting}>
                                            <FileDown size={14} />
                                            <span>{t('analysis.exportMenuPdfTitle')}</span>
                                        </button>
                                    </ActionMenu>
                                </div>
                            </div>

                            <div className="lf-tile lf-tile-glass">
                                <div className="lf-tile-header">
                                    <AlertTriangle size={28} className="lf-tile-icon error" />
                                    <span className="lf-tile-badge error">{t('analysis.actionRequired')}</span>
                                </div>
                                <h3>{t('analysis.issues')}</h3>
                                <p className="lf-tile-big-text">{issues.length}</p>
                            </div>

                            <div className="lf-tile lf-tile-glass lf-tile-wide">
                                <div className="lf-tile-wide-content">
                                    <h3>{t('analysis.contractMetadata')}</h3>
                                    <div className="lf-meta-rows">
                                        {analysis?.propertyAddress && (
                                            <div className="lf-meta-row">
                                                <MapPin size={16} /> <span>{analysis.propertyAddress}</span>
                                            </div>
                                        )}
                                        {analysis?.landlordName && (
                                            <div className="lf-meta-row">
                                                <UserRound size={16} /> <span>{analysis.landlordName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="lf-tile-wide-side">
                                    <p className="lf-side-label">{t('contracts.uploadDate')}</p>
                                    <p className="lf-side-value">
                                        {analysis?.uploadDate ? new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US') : '--'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'issues' && issues.length > 0 && (
                    <div className="lf-section-divider no-print">
                        <div className="lf-line"></div>
                        <h2>{t('analysis.deepAnalysisAndClauses')}</h2>
                        <div className="lf-line"></div>
                    </div>
                )}

                {/* 4. Two-Column Analysis Area */}
                <div className="lf-analysis-columns">
                    
                    {/* Left Column: Issues List or Contract View */}
                    <div className="lf-main-content">
                        
                        {activeTab === 'issues' && issues.length > 0 && (
                            <div className="lf-issues-list">
                                {issues.map((issue, index) => {
                                    const riskClass = getRiskLabel(issue.risk_level);
                                    const isExpanded = expandedIssue === index;
                                    const clauseTitle =
                                        pickInlineText(
                                            issue.clause_topic,
                                            issue.title,
                                            issue.section_title,
                                            issue.heading,
                                            issue.topic
                                        ) ||
                                        t('analysis.untitledClause') ||
                                        'Untitled clause';
                                    const clauseOriginal = pickBlockText(
                                        issue.original_text,
                                        issue.original,
                                        issue.clause_text,
                                        issue.clause
                                    );
                                    const clauseExplanation = pickBlockText(
                                        issue.explanation,
                                        issue.problem,
                                        issue.why_it_matters,
                                        issue.description,
                                        issue.details
                                    );
                                    const clauseFix = pickBlockText(
                                        issue.suggested_fix,
                                        issue.recommendation,
                                        issue.suggestedFix,
                                        issue.solution,
                                        issue.fix
                                    );
                                    const clauseTip = pickBlockText(issue.negotiation_tip, issue.tip, issue.negotiationTip);
                                    const clausePreview =
                                        pickInlineText(clauseExplanation, clauseOriginal) ||
                                        t('analysis.noDetailedContent') ||
                                        'No detailed analysis available yet.';

                                    const handleCopy = async (text, idx) => {
                                        try {
                                            const copied = await copyTextToClipboard(text);
                                            if (!copied) {
                                                showExportNotice(t('analysis.shareCopyFailed'));
                                                return;
                                            }
                                            setCopiedIndex(idx);
                                            setTimeout(() => setCopiedIndex(null), 2000);
                                        } catch (err) {
                                            console.error('Failed to copy:', err);
                                            showExportNotice(t('analysis.shareCopyFailed'));
                                        }
                                    };

                                    return (
                                        <div key={index} className={`lf-clause-card ${isExpanded ? 'expanded' : ''}`}>
                                            <div className={`lf-risk-line border-${riskClass}`}></div>
                                            
                                            {/* Header */}
                                            <div className="lf-clause-header" onClick={() => setExpandedIssue(isExpanded ? null : index)}>
                                                <div className="lf-clause-title-area">
                                                    <div className="lf-clause-badges">
                                                        <span className={`lf-badge bg-${riskClass}`}>
                                                            {issue.risk_level === 'High' && t('score.highRisk')}
                                                            {issue.risk_level === 'Medium' && t('score.mediumRisk')}
                                                            {issue.risk_level === 'Low' && t('score.lowRisk')}
                                                        </span>
                                                        {issue.penalty_points && (
                                                            <span className="lf-badge-points">-{issue.penalty_points} {t('analysis.points')}</span>
                                                        )}
                                                    </div>
                                                    <h3>{clauseTitle}</h3>
                                                    <p className="lf-clause-preview">{clausePreview}</p>
                                                </div>
                                                <button className="lf-expand-btn">
                                                    <ChevronDown size={20} className={isExpanded ? 'rotated' : ''} />
                                                </button>
                                            </div>

                                            {/* Body */}
                                            {isExpanded && (
                                                <div className="lf-clause-body">
                                                    {/* Original Quote */}
                                                    {clauseOriginal && (
                                                        <div className="lf-quote-box">
                                                            <span className="material-symbols-outlined lf-quote-icon">format_quote</span>
                                                            <p>"{clauseOriginal}"</p>
                                                        </div>
                                                    )}

                                                    {/* Analysis Grid */}
                                                    <div className="lf-analysis-grid">
                                                        {clauseExplanation && (
                                                            <div className="lf-analysis-item">
                                                                <div className="lf-item-icon bg-error">
                                                                    <AlertTriangle size={20} />
                                                                </div>
                                                                <div className="lf-item-text">
                                                                    <h4>{t('analysis.theIssue')}</h4>
                                                                    <p>{clauseExplanation}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {clauseFix && (
                                                            <div className="lf-analysis-item">
                                                                <div className="lf-item-icon bg-primary">
                                                                    <Wand2 size={20} />
                                                                </div>
                                                                <div className="lf-item-text">
                                                                    <h4>{t('analysis.negotiationStrategy')}</h4>
                                                                    <p>{clauseFix}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    {clauseFix && (
                                                        <div className="lf-clause-actions">
                                                            <button 
                                                                className={`lf-btn-primary ${copiedIndex === index ? 'copied' : ''}`}
                                                                onClick={(e) => { e.stopPropagation(); handleCopy(clauseFix, index); }}
                                                            >
                                                                {copiedIndex === index ? <Check size={18} /> : <Copy size={18} />}
                                                                {copiedIndex === index ? t('analysis.copied') : t('analysis.copyFix')}
                                                            </button>
                                                            
                                                            {clauseTip && (
                                                                <div className="lf-tip-box">
                                                                    <Lightbulb size={16} />
                                                                    <span>{clauseTip}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === 'issues' && issues.length === 0 && (
                            <div className="lf-no-issues">
                                {result?.is_contract === false ? (
                                    <>
                                        <AlertTriangle size={48} className="warning-icon" />
                                        <h3>{t('analysis.notRentalTitle')}</h3>
                                        <p>{t('analysis.notRentalDescription')}</p>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={48} className="success-icon" />
                                        <h3>{t('analysis.noIssues')}</h3>
                                        <p>{t('analysis.noIssuesDescription')}</p>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'contract' && (
                            <>
                                {result?.is_contract !== false && (
                                    <div className="lf-contract-actions-wrapper no-print">
                                        <div className="lf-contract-export-bar">
                                            <div className="lf-contract-export-row">
                                                <button className="lf-contract-export-btn" onClick={() => contractViewRef.current?.handleExport()}>
                                                    <FileText size={16} />
                                                    <span>{t('analysis.exportEditedWord')}</span>
                                                </button>
                                                <button
                                                    className="lf-contract-reset-btn"
                                                    title={t('analysis.resetEditsTitle')}
                                                    onClick={() => contractViewRef.current?.requestClearAll()}
                                                    disabled={contractEditState.editedCount === 0}
                                                >
                                                    <Eraser size={16} />
                                                    <span>{t('analysis.resetEdits')}</span>
                                                    <span className="lf-contract-reset-counter">{contractEditState.editedCount}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="lf-contract-view-wrapper">
                                    {result?.is_contract === false ? (
                                        <div className="lf-no-issues">
                                            <AlertTriangle size={48} className="warning-icon" />
                                            <h3>{t('analysis.notRentalTitle')}</h3>
                                            <p>{t('analysis.notRentalContentDescription')}</p>
                                        </div>
                                    ) : (
                                        <ContractView
                                            ref={contractViewRef}
                                            contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                                            backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                                            issues={issues}
                                            contractId={analysis?.contractId || contractId}
                                            onClauseChange={(clauseId, text, action) => {
                                                setEditedClauses(prev => ({ ...prev, [clauseId]: { text, action } }));
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
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Column: Sticky Sidebar Context */}
                    <aside className="lf-sidebar-column no-print">
                        
                        {result?.is_contract !== false && (
                            <div className={`lf-share-accordion ${isShareAccordionOpen ? 'expanded' : ''}`}>
                                <button
                                    className="methodology-toggle lf-share-accordion-trigger"
                                    onClick={() => setIsShareAccordionOpen(!isShareAccordionOpen)}
                                    aria-expanded={isShareAccordionOpen}
                                >
                                    <div className="toggle-content lf-share-accordion-title">
                                        <Share2 size={16} />
                                        <span>{t('analysis.secureShareLink')}</span>
                                    </div>
                                    <ChevronDown size={16} className={`methodology-chevron lf-share-chevron ${isShareAccordionOpen ? 'rotated' : ''}`} />
                                </button>

                                <div className="methodology-content-wrapper lf-share-accordion-content">
                                    <div className="methodology-content lf-share-accordion-inner">
                                        {!shareLink || !isSharePanelVisible ? (
                                            <button className="lf-action-btn" onClick={handleCopyShareLink} disabled={isGeneratingShareLink}>
                                                <Share2 size={16} />
                                                <span>{isGeneratingShareLink ? t('analysis.shareButtonCreating') : t('analysis.shareButtonCreate')}</span>
                                            </button>
                                        ) : (
                                            <div ref={sharePanelRef} className="lf-share-panel mt-4">
                                                <div className="lf-share-header">
                                                    <span>{t('analysis.secureShareLink')}</span>
                                                    <span className="lf-share-expiry">{getShareExpiryLabel()}</span>
                                                </div>
                                                <input type="text" readOnly value={shareLink} className="lf-share-input" onFocus={e => e.target.select()} />
                                                <div className="lf-share-buttons">
                                                    <button className="lf-share-btn-icon" onClick={handleManualCopyShareLink} title={t('analysis.copyLink')}><Copy size={14}/></button>
                                                    <button className="lf-share-btn-icon" onClick={handleShareLinkViaApps} disabled={isSharingLink} title={t('analysis.shareViaApps')}><Share2 size={14}/></button>
                                                    <a className="lf-share-btn-icon" href={shareLink} target="_blank" rel="noreferrer" title={t('analysis.openLink')}><ExternalLink size={14}/></a>
                                                    <button className="lf-share-btn-icon danger" onClick={handleRevokeShareLink} disabled={isRevokingShareLink} title={t('analysis.revokeLink')}><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Existing Score Breakdown & Methodology */}
                        <div className="lf-existing-components">
                            <ScoreBreakdown overallScore={riskScore} breakdown={scoreBreakdown} issues={issues} />
                            <ScoreMethodology alwaysOpen={true} /> 
                        </div>

                    </aside>

                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;