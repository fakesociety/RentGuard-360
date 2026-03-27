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
    Trash2,
    ExternalLink,
    MapPin,
    UserRound,
    CalendarDays,
    ScrollText,
    AlertTriangle,
    ShieldCheck
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
            return isRTL ? 'יוצר קישור...' : 'Creating link...';
        }
        if (shareLink && isSharePanelVisible) {
            return isRTL ? 'הסתר קישור שיתוף' : 'Hide shared link';
        }
        if (shareLink && !isSharePanelVisible) {
            return isRTL ? 'הצג קישור שיתוף פעיל' : 'Show shared link';
        }
        return isRTL ? 'יצירת לינק שיתוף' : 'Create share link';
    }, [isGeneratingShareLink, isRTL, isSharePanelVisible, shareLink]);

    const showExportNotice = useCallback((message) => {
        setExportNotice(message);
        setTimeout(() => setExportNotice(null), 3000);
    }, []);

    const showAppToast = useCallback((title, message) => {
        window.dispatchEvent(new CustomEvent('rg:toast', {
            detail: {
                id: `share-${Date.now()}`,
                title,
                message,
                createdAt: Date.now(),
                ttlMs: 2600,
            },
        }));
    }, []);

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
            await exportToWord(analysis, analysis?.fileName || (isRTL ? 'דוח_ניתוח' : 'Analysis_Report'));
            showExportNotice(isRTL ? 'קובץ docx (Word) ירד למחשב' : 'Word (.docx) download started');
        } finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    }, [analysis, isRTL, showExportNotice]);

    const handleExportPdf = useCallback(async () => {
        setIsExporting(true);
        try {
            await exportToPDF(analysis, analysis?.fileName || (isRTL ? 'דוח_ניתוח' : 'Analysis_Report'));
            showExportNotice(isRTL ? 'קובץ PDF ירד למחשב' : 'PDF file download started');
        } finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    }, [analysis, isRTL, showExportNotice]);

    const handleCopyShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId) {
            showExportNotice(isRTL ? 'לא נמצא מזהה חוזה לשיתוף' : 'Missing contract id for sharing');
            return;
        }

        if (shareLink) {
            if (isSharePanelVisible) {
                setIsSharePanelVisible(false);
                showExportNotice(isRTL ? 'פאנל השיתוף הוסתר' : 'Share panel hidden');
            } else {
                focusSharePanel();
                showExportNotice(isRTL ? 'קישור שיתוף פעיל מוצג' : 'Active share link is shown');
            }
            setShowExportMenu(false);
            return;
        }

        setIsGeneratingShareLink(true);
        try {
            // Force-save latest local edits before creating the share token.
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
            showExportNotice(isRTL ? 'קישור שיתוף נוצר. אפשר להעתיק או לשתף מהפאנל.' : 'Share link created. Copy or share it from the panel.');
        } catch (err) {
            console.error('Failed to create share link', err);
            showExportNotice(isRTL ? 'שגיאה ביצירת קישור שיתוף' : 'Failed to create share link');
        } finally {
            setIsGeneratingShareLink(false);
            setShowExportMenu(false);
        }
    }, [analysis?.contractId, contractId, focusSharePanel, isRTL, isSharePanelVisible, persistShareLink, shareLink, showExportNotice, userAttributes?.sub]);

    const handleManualCopyShareLink = useCallback(async () => {
        if (!shareLink) return;

        try {
            await copyTextToClipboard(shareLink);
            showAppToast(
                isRTL ? 'הקישור הועתק בהצלחה' : 'Link copied successfully',
                isRTL ? 'אפשר להדביק ולשתף בכל אפליקציה.' : 'You can now paste and share it anywhere.'
            );
        } catch (err) {
            console.error('Failed to copy share link', err);
            showExportNotice(isRTL ? 'שגיאה בהעתקת הקישור' : 'Failed to copy link');
        }
    }, [copyTextToClipboard, isRTL, shareLink, showAppToast, showExportNotice]);

    const handleShareLinkViaApps = useCallback(async () => {
        if (!shareLink) return;

        if (!navigator?.share) {
            await handleManualCopyShareLink();
            return;
        }

        setIsSharingLink(true);
        try {
            await navigator.share({
                title: isRTL ? 'חוזה משותף מ-RentGuard 360' : 'Shared contract from RentGuard 360',
                text: isRTL ? 'צפייה בחוזה (קריאה בלבד):' : 'View the contract (read-only):',
                url: shareLink,
            });
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('Failed to share link via apps', err);
                showExportNotice(isRTL ? 'שגיאה בשיתוף הקישור' : 'Failed to share link');
            }
        } finally {
            setIsSharingLink(false);
        }
    }, [handleManualCopyShareLink, isRTL, shareLink, showExportNotice]);

    const handleRevokeShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId) {
            showExportNotice(isRTL ? 'לא נמצא מזהה חוזה לשיתוף' : 'Missing contract id for sharing');
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
                isRTL ? 'קישור השיתוף בוטל' : 'Share link revoked',
                isRTL ? 'הקישור הישן כבר לא פעיל.' : 'The old link is no longer active.'
            );
        } catch (err) {
            console.error('Failed to revoke share link', err);
            showExportNotice(isRTL ? 'שגיאה בביטול קישור שיתוף' : 'Failed to revoke share link');
        } finally {
            setIsRevokingShareLink(false);
        }
    }, [analysis?.contractId, clearShareLinkCache, contractId, isRTL, showAppToast, showExportNotice]);

    const handleSaveToCloud = useCallback(async (clauses, fullEditedText) => {
        const userId = userAttributes?.sub || 'unknown-user';
        const contractIdClean = analysis?.contractId || contractId;
        await saveEditedContract(contractIdClean, userId, clauses, fullEditedText);
    }, [analysis?.contractId, contractId, userAttributes?.sub]);

    const fetchAnalysis = useCallback(async () => {
        try {
            // Only show loading spinner on first load, not during polling
            if (pollCount === 0) {
                setIsLoading(true);
            }

            const decodedId = decodeURIComponent(contractId);
            console.log('Fetching analysis for:', decodedId);
            const data = await getAnalysis(decodedId);
            setAnalysis(prev => ({
                ...prev, // Keep existing metadata (like from navigation state)
                ...data, // Overwrite with fresh data
                // Ensure metadata persists if api returns nulls but we had them in state
                fileName: data.fileName || prev?.fileName || data.fileName,
                propertyAddress: data.propertyAddress || prev?.propertyAddress || data.propertyAddress,
                landlordName: data.landlordName || prev?.landlordName || data.landlordName,
                uploadDate: data.uploadDate || prev?.uploadDate || data.uploadDate,
            }));
            setError(null); // Clear error on success
        } catch (err) {
            console.error('Failed to fetch analysis:', err);

            // Parse error message for user-friendly display
            const errorMsg = err.message || '';

            if (errorMsg.includes('404')) {
                setError({
                    title: 'Analysis Not Ready',
                    message: `Your contract is still being processed. Auto-checking... (${pollCount + 1}/${MAX_POLL_ATTEMPTS})`,
                    type: 'processing'
                });
            } else if (errorMsg.includes('FAILED') || errorMsg.includes('ValidationException')) {
                setError({
                    title: 'Analysis Failed',
                    message: 'There was an error analyzing your contract. Our team has been notified. Please try uploading again.',
                    type: 'failed',
                    details: errorMsg
                });
            } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
                setError({
                    title: 'Analysis Timed Out',
                    message: 'The analysis is taking longer than expected. Please check back in a few minutes.',
                    type: 'timeout'
                });
            } else {
                setError({
                    title: 'Something Went Wrong',
                    message: 'Failed to load analysis results. Please try again.',
                    type: 'error',
                    details: errorMsg
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [contractId, pollCount]);

    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    // Auto-polling when analysis is still processing
    useEffect(() => {
        // Only poll if we have a 'processing' error and haven't exceeded max attempts
        if (error?.type === 'processing' && pollCount < MAX_POLL_ATTEMPTS && !USE_MOCK) {
            // Use longer delay for first poll (analysis takes 30-60s typically)
            const delay = pollCount === 0 ? INITIAL_DELAY : POLL_INTERVAL;
            console.log(`Auto-polling in ${delay / 1000}s... (attempt ${pollCount + 1}/${MAX_POLL_ATTEMPTS})`);

            const pollTimer = setTimeout(() => {
                setPollCount(prev => prev + 1);
                fetchAnalysis();
            }, delay);

            return () => clearTimeout(pollTimer);
        }
    }, [error, pollCount, USE_MOCK, fetchAnalysis]);

    // Reset poll count when analysis succeeds
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

        // Immediate UX: hydrate from local cache first.
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
                // Keep cached link if available; otherwise clear visual state.
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
            return isRTL ? 'בתוקף ל-7 ימים' : 'Valid for 7 days';
        }

        const secondsLeft = Math.floor(shareLinkExpiresAt - (Date.now() / 1000));
        if (secondsLeft <= 0) {
            return isRTL ? 'פג תוקף' : 'Expired';
        }

        const daysLeft = Math.ceil(secondsLeft / 86400);
        if (isRTL) {
            return `בתוקף לעוד ${daysLeft} ימים`;
        }
        return `Valid for ${daysLeft} more day${daysLeft === 1 ? '' : 's'}`;
    }, [isRTL, shareLinkExpiresAt]);



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
        const errorIcon = {
            processing: '⏳',
            timeout: '⏱️',
            failed: '❌',
            error: '⚠️'
        }[error.type] || '⚠️';

        return (
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`error-state error-${error.type}`}>
                    <div className="error-icon">{errorIcon}</div>
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="error-details">
                            <summary>{isRTL ? 'פרטים טכניים' : 'Technical Details'}</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>{isRTL ? 'נסה שוב' : 'Try Again'}</Button>
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
                
                <div className="analysis-header animate-fadeIn no-print">
                    <h1>{t('analysis.title')}</h1>
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
                                        {analysis?.fileName || (isRTL ? 'מסמך חוזה' : 'Contract Document')}
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
                                <p>{result?.summary || (isRTL ? 'הניתוח הושלם.' : 'Analysis complete.')}</p>
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
                                    <div className="export-menu-title">{isRTL ? 'ייצוא דוח הניתוח' : 'Export Analysis Report'}</div>
                                    <div className="export-menu-group-title">{isRTL ? 'הורדה' : 'Download'}</div>
                                    <button onClick={handleExportWord} disabled={isExporting}>
                                        {isRTL ? 'ייצוא ל-Word - דוח ניתוח' : 'Export to Word - Analysis Report'}
                                        <span className="export-note">{isRTL ? '(ייצוא כקובץ docx (Word), ניתן לעריכה מלאה)' : '(.docx editable, best Hebrew support)'}</span>
                                    </button>
                                    <button onClick={handleExportPdf} disabled={isExporting}>
                                        {isRTL ? 'הורדה PDF - דוח ניתוח' : 'Download PDF - Analysis Report'}
                                        <span className="export-note">{isRTL ? '(תצוגה ושיתוף מהיר, אנגלית בלבד)' : '(best for quick viewing/sharing, English only)'}</span>
                                    </button>
                                    <div className="export-menu-group-title">{isRTL ? 'שיתוף' : 'Share'}</div>
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
                                {isRTL ? 'החוזה המלא' : 'Full Contract'}
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
                                                                    -{issue.penalty_points} {isRTL ? 'נקודות' : 'points'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button className={`expand-trigger ${expandedIssue === index ? 'expanded' : ''}`}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="6 9 12 15 18 9"></polyline>
                                                        </svg>
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
                                                                <h4 className="section-label">{isRTL ? 'הסעיף המקורי' : t('analysis.original')}</h4>
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
                                                                <h4 className="section-label">{isRTL ? 'בסיס משפטי' : 'Legal Basis'}</h4>
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
                                                            <h4 className="section-label">{isRTL ? 'למה זה חשוב?' : 'Why It Matters'}</h4>
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
                                                                <h4 className="section-label">{isRTL ? 'הנוסח המומלץ' : t('analysis.recommendation')}</h4>
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

                                                    {/* Negotiation Tip */}
                                                    {issue.negotiation_tip && (
                                                        <div className="legal-section tip-section">
                                                            <div className="section-icon tip-icon">
                                                                <MessageCircle size={18} />
                                                            </div>
                                                            <div className="section-body">
                                                                <h4 className="section-label tip-label">💡 {isRTL ? 'טיפ למשא ומתן' : 'Negotiation Tip'}</h4>
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
                                            <h3>{isRTL ? 'זה לא חוזה שכירות' : 'Not a Rental Contract'}</h3>
                                            <p>{isRTL ? 'המסמך שהועלה אינו נראה כחוזה שכירות תקין. אנא העלו חוזה שכירות למגורים בפורמט PDF.' : 'The uploaded document does not appear to be a valid rental contract. Please upload a residential rental contract in PDF format.'}</p>
                                        </>
                                    ) : (
                                        <>
                                            <span className="no-issues-icon" aria-hidden="true">
                                                <ShieldCheck size={40} strokeWidth={2} />
                                            </span>
                                            <h3>{t('analysis.noIssues')}</h3>
                                            <p>{isRTL ? 'חוזה זה נראה תקין ללא דגלים אדומים משמעותיים.' : 'This contract appears to be in good standing with no significant red flags.'}</p>
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
                                            <span style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</span>
                                            <h3 style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 'bold',
                                                color: 'var(--warning-color)',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {isRTL ? 'זה לא חוזה שכירות' : 'Not a Rental Contract'}
                                            </h3>
                                            <p style={{
                                                fontSize: '1rem',
                                                color: 'var(--text-secondary)',
                                                maxWidth: '450px',
                                                lineHeight: '1.6'
                                            }}>
                                                {isRTL
                                                    ? 'המסמך שהועלה אינו נראה כחוזה שכירות תקין. לא ניתן להציג את תוכן החוזה.'
                                                    : 'The uploaded document does not appear to be a valid rental contract. Cannot display contract content.'}
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
                                            // Export edited contract to Word with Hebrew
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
                                <div className="export-primary-action export-primary-action-inline">
                                    <button className="export-btn-main" onClick={() => contractViewRef.current?.handleExport()}>
                                        <span className="export-btn-label">{isRTL ? 'ייצוא כקובץ docx (Word)' : 'Export to Word (.docx)'}</span>
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
                                </div>

                                {contractEditState.editedCount > 0 && (
                                    <button
                                        className="export-btn-secondary"
                                        onClick={() => contractViewRef.current?.requestClearAll()}
                                    >
                                        <Trash2 size={14} aria-hidden="true" />
                                        <span>{isRTL ? 'נקה עריכות' : 'Clear edits'} ({contractEditState.editedCount})</span>
                                    </button>
                                )}

                                <div className="save-status-indicator">
                                    {contractEditState.saveStatus === 'saving' && (
                                        <span className="save-status saving">💾 {isRTL ? 'שומר שינויים...' : 'Saving...'}</span>
                                    )}
                                    {contractEditState.saveStatus === 'success' && (
                                        <span className="save-status success">✅ {isRTL ? 'נשמר בהצלחה' : 'Saved'}</span>
                                    )}
                                    {contractEditState.saveStatus === 'error' && (
                                        <span className="save-status error">⚠️ {isRTL ? 'שגיאה בשמירה' : 'Save error'}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'contract' && result?.is_contract !== false && shareLink && isSharePanelVisible && (
                            <div ref={sharePanelRef} className="share-link-panel no-print">
                                <div className="share-link-panel-header">
                                    <div className="share-link-title">{isRTL ? 'קישור שיתוף מאובטח' : 'Secure share link'}</div>
                                    <div className="share-link-expiry">{getShareExpiryLabel()}</div>
                                </div>

                                <div className="share-link-input-wrap">
                                    <input
                                        type="text"
                                        readOnly
                                        value={shareLink}
                                        className="share-link-input"
                                        onFocus={(e) => e.target.select()}
                                        aria-label={isRTL ? 'קישור שיתוף' : 'Share link'}
                                    />
                                </div>

                                <div className="share-link-actions">
                                    <button className="share-link-btn primary" onClick={handleManualCopyShareLink}>
                                        <Copy size={15} />
                                        <span>{isRTL ? 'העתק קישור' : 'Copy link'}</span>
                                    </button>
                                    <button
                                        className="share-link-btn"
                                        onClick={handleShareLinkViaApps}
                                        disabled={isSharingLink || isRevokingShareLink}
                                    >
                                        <Share2 size={15} />
                                        <span>
                                            {isSharingLink
                                                ? (isRTL ? 'משתף...' : 'Sharing...')
                                                : (isRTL ? 'שתף באפליקציות' : 'Share via apps')}
                                        </span>
                                    </button>
                                    <a
                                        className="share-link-btn"
                                        href={shareLink}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink size={15} />
                                        <span>{isRTL ? 'פתח קישור' : 'Open link'}</span>
                                    </a>
                                    <button
                                        className="share-link-btn revoke share-link-btn-end"
                                        onClick={handleRevokeShareLink}
                                        disabled={isRevokingShareLink || isGeneratingShareLink}
                                    >
                                        <Trash2 size={15} />
                                        <span>
                                            {isRevokingShareLink
                                                ? (isRTL ? 'מבטל קישור...' : 'Revoking...')
                                                : (isRTL ? 'ביטול קישור' : 'Revoke link')}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* 3. NEW: The 3rd Column just for the Back Button (Your Red Box) */}
                    <aside className="analysis-side-actions no-print">
                        <Link to="/contracts" className="back-button-premium">
                            {isRTL ? <span className="arrow">→</span> : <span className="arrow">←</span>}
                            {isRTL ? 'חזרה לחוזים' : 'Back to Contracts'}
                        </Link>
                    </aside>
                </div>
            </div>
        </>
    );
};

export default AnalysisPage;

