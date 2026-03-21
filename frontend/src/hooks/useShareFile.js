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
    const shareFile = useCallback(async (blob, fileName, mimeType = 'application/octet-stream') => {
        try {
            const file = new File([blob], fileName, { type: mimeType });

            // Try native share first
            if (canShareFiles(file)) {
                await navigator.share({
                    title: fileName,
                    files: [file],
                });
                return { success: true, method: 'share' };
            } else {
                // Desktop fallback — silent download
                downloadFallback(blob, fileName);
                return { success: true, method: 'download' };
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Share cancelled by user');
                return { success: false, method: 'cancelled' };
            }
            console.error('Share failed:', err);
            // Final fallback
            try {
                downloadFallback(blob, fileName);
                return { success: true, method: 'download' };
            } catch (downloadErr) {
                console.error('Download fallback also failed:', downloadErr);
                return { success: false, method: 'error', error: downloadErr };
            }
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
