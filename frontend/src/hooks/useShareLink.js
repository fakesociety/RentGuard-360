import { useState, useCallback, useRef } from 'react';
import { createShareLink, revokeShareLink } from '../services/api';

export const useShareLink = (contractId, analysis) => {
    const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
    const [isRevokingShareLink, setIsRevokingShareLink] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [shareLinkExpiresAt, setShareLinkExpiresAt] = useState(null);
    const [isSharePanelVisible, setIsSharePanelVisible] = useState(true);
    const sharePanelRef = useRef(null);

    const getShareCacheKey = useCallback((id) => `rentguard_share_link_${id}`, []);

    const persistShareLink = useCallback((id, url, expiresAt) => {
        try {
            localStorage.setItem(getShareCacheKey(id), JSON.stringify({
                url,
                expiresAt,
                createdAt: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Failed to persist share link cache', error);
        }
    }, [getShareCacheKey]);

    const clearShareLinkCache = useCallback((id) => {
        try {
            localStorage.removeItem(getShareCacheKey(id));
        } catch (error) {
            console.warn('Failed to clear share link cache', error);
        }
    }, [getShareCacheKey]);

    const handleCopyShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId) return { error: 'Missing contract ID' };

        setIsGeneratingShareLink(true);
        if (shareLink) {
            if (isSharePanelVisible) {
                setIsSharePanelVisible(false);
                return { status: 'hidden' };
            } else {
                setIsSharePanelVisible(true);
                sharePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return { status: 'shown' };
            }
        }

        try {
            const data = await createShareLink(shareContractId);
            const generatedUrl = `${window.location.origin}/#/shared/${data.shareToken}`;
            setShareLink(generatedUrl);
            setShareLinkExpiresAt(data.expiresAt);
            setIsSharePanelVisible(true);
            persistShareLink(shareContractId, generatedUrl, data.expiresAt);

            await navigator.clipboard.writeText(generatedUrl);
            setTimeout(() => {
                sharePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            
            return { status: 'success', msg: 'Copied' };
        } catch (err) {
            console.error('Failed to general share link:', err);
            return { error: 'Failed to create link' };
        } finally {
            setIsGeneratingShareLink(false);
        }
    }, [analysis?.contractId, contractId, isSharePanelVisible, persistShareLink, shareLink]);

    const handleRevokeShareLink = useCallback(async () => {
        const shareContractId = analysis?.contractId || contractId;
        if (!shareContractId || !shareLink) return { error: 'No active link to revoke' };

        const confirmRevoke = window.confirm('Are you sure you want to revoke this link? Anyone with it will lose access.');
        if (!confirmRevoke) return { status: 'cancelled' };

        setIsRevokingShareLink(true);
        try {
            await revokeShareLink(shareContractId);
            setShareLink('');
            setShareLinkExpiresAt(null);
            clearShareLinkCache(shareContractId);
            setIsSharePanelVisible(false);
            return { status: 'revoked' };
        } catch (err) {
            console.error('Failed to revoke link:', err);
            return { error: 'Failed to revoke link' };
        } finally {
            setIsRevokingShareLink(false);
        }
    }, [analysis?.contractId, clearShareLinkCache, contractId, shareLink]);

    const handleManualCopyShareLink = useCallback(async () => {
        if (!shareLink) return;
        try {
            await navigator.clipboard.writeText(shareLink);
            return { status: 'copied' };
        } catch (err) {
            return { error: 'Failed to copy' };
        }
    }, [shareLink]);

    return {
        shareLink, setShareLink,
        shareLinkExpiresAt, setShareLinkExpiresAt,
        isGeneratingShareLink,
        isRevokingShareLink,
        isSharePanelVisible, setIsSharePanelVisible,
        sharePanelRef,
        persistShareLink,
        getShareCacheKey,
        handleCopyShareLink,
        handleRevokeShareLink,
        handleManualCopyShareLink
    };
};
