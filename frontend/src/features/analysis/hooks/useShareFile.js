/**
 * ============================================
 *  useShareFile Hook
 *  Share generated files via native Web Share API
 *  with silent download fallback for unsupported desktop browsers
 * ============================================
 * 
 * USAGE:
 *   const { shareFile } = useShareFile();
 *   shareFile(blob, 'report.docx', 'application/vnd...');
 * 
 * BEHAVIOR:
 * - Supported (Mobile + Win11): Opens native OS share menu
 * - Unsupported (Older Desktop): Falls back to standard browser download
 * 
 * ============================================
 */

import { useCallback } from 'react';

import { resolveShareFileName, canShareFiles, downloadFallback } from '../utils/fileShareUtils';

/**
 * Custom hook for sharing files via the Web Share API.
 */
const useShareFile = () => {
    // ------------------------------------------------------------------------
    // MAIN SHARE: Detects capabilities -> Fires native sheet / falls back to generic download
    // Blocks multiple parallel share triggers via global locks
    // ------------------------------------------------------------------------
    const shareFile = useCallback(async (
        blob,
        fileName,
        mimeType = 'application/octet-stream',
        options = {}
    ) => {
        const { fallbackMode = 'download', fileNameMode = 'auto', includeTitle = false } = options;
        const safeFileName = resolveShareFileName(fileName, fileNameMode);

        if (window._isFileSharingModalOpen) {
            return { success: false, method: 'cancelled' };
        }
        window._isFileSharingModalOpen = true;
        const resetLock = () => { setTimeout(() => { window._isFileSharingModalOpen = false; }, 1000); };

        try {
            if (!navigator?.share) {
                resetLock();
                if (fallbackMode === 'download') {
                    downloadFallback(blob, safeFileName);
                    return { success: true, method: 'download' };
                }
                return { success: false, method: 'unsupported' };
            }

            const primaryFile = new File([blob], safeFileName, { type: mimeType });
            const relaxedFile = new File([blob], safeFileName);

            if (canShareFiles(primaryFile)) {
                await navigator.share({ files: [primaryFile], title: includeTitle ? safeFileName : undefined });
                resetLock();
                return { success: true, method: 'share' };
            }
            if (canShareFiles(relaxedFile)) {
                await navigator.share({ files: [relaxedFile], title: includeTitle ? safeFileName : undefined });
                resetLock();
                return { success: true, method: 'share' };
            }
            await navigator.share({ files: [primaryFile], title: includeTitle ? safeFileName : undefined });
            resetLock();
            return { success: true, method: 'share' };

        } catch (err) {
            resetLock();
            if (err.name === 'AbortError') {
                console.log('Share cancelled by user');
                return { success: false, method: 'cancelled' };
            }
            console.error('Share failed:', err);
            if (fallbackMode === 'download') {
                try {
                    downloadFallback(blob, safeFileName);
                    return { success: true, method: 'download' };
                } catch (downloadErr) {
                    return { success: false, method: 'error', error: downloadErr };
                }
            }
            return { success: false, method: 'error', error: err };
        }
    }, []);

    /**
     * Share plain text as a .txt file.
     */
    const shareTextAsFile = useCallback(async (textContent, fileName = 'document.txt') => {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        return shareFile(blob, fileName, 'text/plain;charset=utf-8');
    }, [shareFile]);

    // ------------------------------------------------------------------------
    // TEXT SHARE: Share raw text links to WhatsApp, Telegram, Mail
    // ------------------------------------------------------------------------
    const shareUrl = useCallback(async ({ url, title, text, fallbackAction }) => {
        if (window._isFileSharingModalOpen) return { success: false, method: 'cancelled' };
        window._isFileSharingModalOpen = true;

        const resetLock = () => { setTimeout(() => { window._isFileSharingModalOpen = false; }, 1000); };

        if (!navigator?.share) {
            resetLock();
            if (fallbackAction) await fallbackAction();
            return { success: false, method: 'fallback' };
        }

        try {
            await navigator.share({ title, url, text });
            resetLock();
            return { success: true, method: 'share' };
        } catch (err) {
            resetLock();
            if (err.name === 'AbortError') {
                return { success: false, method: 'cancelled' };
            }
            console.error('Failed to share via apps', err);
            if (fallbackAction) await fallbackAction();
            return { success: false, method: 'error', error: err };
        }
    }, []);

    return { shareFile, shareTextAsFile, shareUrl };
};

export default useShareFile;
