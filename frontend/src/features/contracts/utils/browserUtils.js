/**
 * Utility functions for browser APIs (Clipboard, Share, etc.)
 */

/**
 * Copies text to the clipboard using modern Clipboard API with a fallback to document.execCommand('copy').
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const copyToClipboard = async (text) => {
    // 1. Try modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (clipboardErr) {
            console.warn('Clipboard API failed, trying fallback...', clipboardErr);
        }
    }

    // 2. Fallback to execCommand (legacy)
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    } catch (e) {
        console.error('Fallback copy also failed', e);
        return false;
    }
};
