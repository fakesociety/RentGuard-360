/**
 * ============================================
 *  fileShareUtils
 *  Utility functions for handling file names and
 *  sharing fallback behaviors.
 * ============================================
 */

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

export const resolveShareFileName = (rawFileName, mode = 'auto') => {
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
export const canShareFiles = (file) => {
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
export const downloadFallback = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup after a short delay to ensure the download starts
    setTimeout(() => {
        if (document.body.contains(a)) {
            document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
    }, 100);
};
