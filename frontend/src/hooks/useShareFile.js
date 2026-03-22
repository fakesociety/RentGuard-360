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

const sanitizeFileName = (rawFileName) => {
    const normalized = String(rawFileName || 'document').normalize('NFC');
    const fileNameOnly = normalized.replace(/[\\/]/g, ' ');

    const lastDot = fileNameOnly.lastIndexOf('.');
    const base = lastDot > 0 ? fileNameOnly.slice(0, lastDot) : fileNameOnly;
    const ext = lastDot > 0 ? fileNameOnly.slice(lastDot + 1) : '';

    // Keep letters/numbers/marks (includes Hebrew), spaces and common filename symbols.
    const safeBase = base
        .replace(/[^\p{L}\p{N}\p{M}\s._()-]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const finalBase = safeBase || 'document';

    return safeExt ? `${finalBase}.${safeExt}` : finalBase;
};

const toAsciiCompatibleFileName = (safeUnicodeFileName) => {
    const lastDot = safeUnicodeFileName.lastIndexOf('.');
    const base = lastDot > 0 ? safeUnicodeFileName.slice(0, lastDot) : safeUnicodeFileName;
    const ext = lastDot > 0 ? safeUnicodeFileName.slice(lastDot + 1) : '';

    // Drop non-ASCII chars for cross-app compatibility (WhatsApp/Desktop targets can mangle Unicode names).
    const asciiBase = base
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/[^a-zA-Z0-9\s._()-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);

    const finalBase = asciiBase || `RentGuard_File_${new Date().toISOString().slice(0, 10)}`;
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return safeExt ? `${finalBase}.${safeExt}` : finalBase;
};

const resolveShareFileName = (rawFileName, mode = 'auto') => {
    const unicodeSafe = sanitizeFileName(rawFileName);

    if (mode === 'unicode') {
        return unicodeSafe;
    }

    if (mode === 'ascii') {
        return toAsciiCompatibleFileName(unicodeSafe);
    }

    // auto: keep Unicode when plain ASCII already; otherwise force ASCII compatibility for share targets.
    const hasNonAscii = /[^\x20-\x7E]/.test(unicodeSafe);
    return hasNonAscii ? toAsciiCompatibleFileName(unicodeSafe) : unicodeSafe;
};

/**
 * Check if the Web Share API supports file sharing.
 */
const canShareFiles = (file) => {
    try {
        return navigator.canShare && navigator.canShare({ files: [file] });
    } catch {
        return false;
    }
};

/**
 * Fallback: trigger a standard browser download.
 * Creates a temporary object URL, clicks a hidden <a>, then revokes the URL.
 */
const downloadFallback = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup after a short delay to ensure the download starts
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

/**
 * Custom hook for sharing files via the Web Share API.
 */
const useShareFile = () => {
    const shareFile = useCallback(async (
        blob,
        fileName,
        mimeType = 'application/octet-stream',
        options = {}
    ) => {
        const { fallbackMode = 'download', fileNameMode = 'auto', includeTitle = false } = options;
        const safeFileName = resolveShareFileName(fileName, fileNameMode);
        try {
            if (!navigator?.share) {
                if (fallbackMode === 'download') {
                    downloadFallback(blob, safeFileName);
                    return { success: true, method: 'download' };
                }
                return { success: false, method: 'unsupported' };
            }

            const primaryFile = new File([blob], safeFileName, { type: mimeType });
            const relaxedFile = new File([blob], safeFileName);

            // Try strict type first (works best when MIME is supported).
            if (canShareFiles(primaryFile)) {
                const shareData = {
                    files: [primaryFile],
                };
                if (includeTitle) {
                    shareData.title = safeFileName;
                }
                await navigator.share({
                    ...shareData,
                });
                return { success: true, method: 'share' };
            }

            // Some browsers reject certain MIME types in canShare; retry without explicit type.
            if (canShareFiles(relaxedFile)) {
                const shareData = {
                    files: [relaxedFile],
                };
                if (includeTitle) {
                    shareData.title = safeFileName;
                }
                await navigator.share({
                    ...shareData,
                });
                return { success: true, method: 'share' };
            }

            // Final native attempt for environments where canShare is overly strict.
            const shareData = {
                files: [primaryFile],
            };
            if (includeTitle) {
                shareData.title = safeFileName;
            }
            await navigator.share({
                ...shareData,
            });
            return { success: true, method: 'share' };

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Share cancelled by user');
                return { success: false, method: 'cancelled' };
            }
            console.error('Share failed:', err);

            if (fallbackMode === 'download') {
                // Final fallback
                try {
                    downloadFallback(blob, safeFileName);
                    return { success: true, method: 'download' };
                } catch (downloadErr) {
                    console.error('Download fallback also failed:', downloadErr);
                    return { success: false, method: 'error', error: downloadErr };
                }
            }

            if (err.name === 'TypeError' || err.name === 'NotAllowedError') {
                return { success: false, method: 'unsupported' };
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

    return { shareFile, shareTextAsFile };
};

export default useShareFile;
