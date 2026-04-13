/**
 * ============================================
 *  useContractShare Hook
 *  Encapsulates the logic for sharing analysis results.
 * ============================================
 * 
 * STRUCTURE:
 * - Local Storage Hydration: Preloads a valid share link from the browser cache.
 * - Share API Interactions: Fetches, creates, and revokes share links from the AWS backend.
 * - Share Fallbacks: Tries native Web Share API (OS level) first, falling back to Clipboard copy.
 * - UI States: Manages the visibility of the share panel, loading spinners, and toast notifications.
 * 
 * DEPENDENCIES:
 * - analysisApi (Create, Get, Revoke AWS signed tokens)
 * - cacheService (Local persistence)
 * - useShareFile (Native Web Share OS integrations)
 * ============================================
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { createShareLink, getShareLink, revokeShareLink } from '@/features/analysis/services/analysisApi';
import { persistShareLink, clearShareLinkCache, getShareCacheKey } from '@/features/analysis/services/cacheService';
import { copyTextToClipboard } from '@/features/analysis/utils/clipboardUtils';
import { showAppToast as emitAppToast } from '@/components/ui/toast/toast';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import useShareFile from '@/features/analysis/hooks/useShareFile';

export const useContractShare = ({ contractId, onSaveBeforeShare }) => {
    const { t } = useLanguage();
    const { shareUrl } = useShareFile();

    // Tracks API requests to prevent double-clicks
    const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
    const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
    // The actual URL to present to the user and its AWS expiration timestamp (TTL)
    const [shareLink, setShareLink] = useState('');
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState(null);
    // Controls whether the share modal/panel is currently expanded on the screen
    const [isSharePanelVisible, setIsSharePanelVisible] = useState(true);

    const sharePanelRef = useRef(null);

    // ------------------------------------------------------------------------
    // INIT & HYDRATION Phase:
    // When the component mounts with a contract ID, we check two places:
    // 1. LocalStorage (For immediate UI rendering without waiting)
    // 2. Network (To verify the token is still valid with the AWS Backend)
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (!contractId) {
            setShareLink('');
            setShareLinkExpiresAt(null);
            setIsSharePanelVisible(false);
            return;
        }

        let hadCachedLink = false;
        try {
            const cachedRaw = localStorage.getItem(getShareCacheKey(contractId));
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                const cachedExpiry = Number(cached?.expiresAt || 0);
                if (cached?.url && (!cachedExpiry || cachedExpiry > (Date.now() / 1000))) {
                    hadCachedLink = true;
                    setShareLink(cached.url);
                    setShareLinkExpiresAt(cached?.expiresAt || null);
                    setIsSharePanelVisible(true);
                } else {
                    clearShareLinkCache(contractId);
                }
            }
        } catch (error) {
            console.warn('Failed to read cache', error);
        }

        let cancelled = false;
        const loadExistingShareLink = async () => {
            try {
                const shareData = await getShareLink(contractId);
                if (cancelled) return;

                if (shareData?.active && shareData?.shareToken) {
                    const url = `${window.location.origin}/#/shared/${encodeURIComponent(shareData.shareToken)}`;
                    setShareLink(url);
                    setShareLinkExpiresAt(shareData?.expiresAt || null);
                    setIsSharePanelVisible(true);
                    persistShareLink(contractId, url, shareData?.expiresAt || null);
                } else {
                    setShareLink('');
                    setShareLinkExpiresAt(null);
                    setIsSharePanelVisible(false);
                    clearShareLinkCache(contractId);
                }
            } catch {
                if (cancelled) return;
                if (!hadCachedLink) {
                    setShareLink('');
                    setShareLinkExpiresAt(null);
                    setIsSharePanelVisible(false);
                }
            }
        };

        loadExistingShareLink();
        return () => { cancelled = true; };
    }, [contractId]);

    // ------------------------------------------------------------------------
    // UI Helpers:
    // Smoothly scrolls the window down to the Share Panel when toggled.
    // Uses requestAnimationFrame to ensure the DOM is updated before scrolling.
    // ------------------------------------------------------------------------
    const focusSharePanel = useCallback(() => {
        setIsSharePanelVisible(true);
        requestAnimationFrame(() => {
            sharePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }, []);

    // ------------------------------------------------------------------------
    // CORE GENERATOR:
    // If the link already exists -> toggle UI visibility.
    // If not -> call onSaveBeforeShare callback (syncs latest manual edits),
    // then request a new 7-days token from the backend API.
    // ------------------------------------------------------------------------
    const handleCopyShareLink = useCallback(async () => {
        if (!contractId) {
            emitAppToast({ type: 'warning', title: t('analysis.missingShareContractId'), message: '' });
            return;
        }

        if (shareLink) {
            if (isSharePanelVisible) {
                setIsSharePanelVisible(false);
                emitAppToast({ type: 'info', title: t('analysis.sharePanelHidden'), message: '' });
            } else {
                focusSharePanel();
                emitAppToast({ type: 'info', title: t('analysis.sharePanelShown'), message: '' });
            }
            return;
        }

        setIsGeneratingShareLink(true);
        try {
            if (onSaveBeforeShare) {
                await onSaveBeforeShare();
            }

            const shareResult = await createShareLink(contractId, 7);
            const token = shareResult?.shareToken;
            if (!token) throw new Error('Missing share token in response');

            const url = `${window.location.origin}/#/shared/${encodeURIComponent(token)}`;
            setShareLink(url);
            setShareLinkExpiresAt(shareResult?.expiresAt || null);
            setIsSharePanelVisible(true);
            persistShareLink(contractId, url, shareResult?.expiresAt || null);
            focusSharePanel();
            
            emitAppToast({ type: 'success', title: t('analysis.shareCreated'), message: '' });
        } catch (err) {
            console.error('Failed to create share link', err);
            emitAppToast({ type: 'error', title: t('analysis.shareCreateFailed'), message: '' });
        } finally {
            setIsGeneratingShareLink(false);
        }
    }, [contractId, focusSharePanel, isSharePanelVisible, shareLink, t, onSaveBeforeShare]);

    // ------------------------------------------------------------------------
    // CLIPBOARD FALLBACK:
    // Writes the URL straight to the user's system clipboard.
    // ------------------------------------------------------------------------
    const handleManualCopyShareLink = useCallback(async () => {
        if (!shareLink) return;
        try {
            await copyTextToClipboard(shareLink);
            emitAppToast({ title: t('analysis.shareCopiedTitle'), message: t('analysis.shareCopiedMessage'), type: 'success' });
        } catch (err) {
            console.error('Failed to copy share link', err);
            emitAppToast({ type: 'error', title: t('analysis.shareCopyFailed'), message: '' });
        }
    }, [shareLink, t]);

    // ------------------------------------------------------------------------
    // NATIVE SHARING:
    // Triggers OS-level bottom sheet (WhatsApp, Email, etc.) on Mobile/Mac.
    // Automatically uses `handleManualCopyShareLink` if the browser doesn't support it.
    // ------------------------------------------------------------------------
    const handleShareLinkViaApps = useCallback(async () => {
        if (!shareLink) return;
        await shareUrl({
            url: shareLink,
            title: t('analysis.shareNativeTitle') || 'Contract Analysis',
            fallbackAction: handleManualCopyShareLink
        });
    }, [handleManualCopyShareLink, shareLink, t, shareUrl]);

    // ------------------------------------------------------------------------
    // SECURITY & REVOCATION:
    // Immediately destroys the token on the AWS side, clears the UI, and purges the Cache.
    // ------------------------------------------------------------------------
    const handleRevokeShareLink = useCallback(async () => {
        if (!contractId) {
            emitAppToast({ type: 'warning', title: t('analysis.missingShareContractId'), message: '' });
            return;
        }

        setIsRevokingShareLink(true);
        try {
            await revokeShareLink(contractId);
            setShareLink('');
            setShareLinkExpiresAt(null);
            setIsSharePanelVisible(false);
            clearShareLinkCache(contractId);
            emitAppToast({ title: t('analysis.shareRevokedTitle'), message: t('analysis.shareRevokedMessage'), type: 'success' });
        } catch (err) {
            console.error('Failed to revoke share link', err);
            emitAppToast({ type: 'error', title: t('analysis.shareRevokeFailed'), message: '' });
        } finally {
            setIsRevokingShareLink(false);
        }
    }, [contractId, t]);

    return {
        isGeneratingShareLink,
        isRevokingShareLink,
        shareLink,
        shareLinkExpiresAt,
        isSharePanelVisible,
        sharePanelRef,
        handleCopyShareLink,
        handleManualCopyShareLink,
        handleShareLinkViaApps,
        handleRevokeShareLink,
        setIsSharePanelVisible,
        focusSharePanel
    };
};
