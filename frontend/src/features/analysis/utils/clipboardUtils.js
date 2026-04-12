export const copyTextToClipboard = async (text) => {
    if (!text) return false;
    if (navigator?.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (clipboardError) {
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
};
