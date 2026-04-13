export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableError = (err) => {
    const msg = (err?.message || '').toLowerCase();
    return msg.includes('internal server error') ||
           msg.includes('502') || msg.includes('503') ||
           msg.includes('bad gateway') ||
           msg.includes('service unavailable') ||
           msg.includes('timed out');
};

export const validateFile = (file, t) => {
    const maxSize = 5 * 1024 * 1024;
    const minSize = 30 * 1024;
    const maxFileNameLength = 100;
    
    if (!file.type.includes('pdf')) {
        return t('upload.pdfOnly');
    }
    if (file.size > maxSize) {
        return t('upload.fileTooLarge');
    }
    if (file.size < minSize) {
        return t('upload.fileTooSmall');
    }
    if (file.name.length > maxFileNameLength) {
        return t('upload.fileNameTooLong');
    }
    return null;
};

export const formatFileSize = (bytes, t) => {
    if (bytes === 0) return `0 ${t('upload.fileSizeByte')}`;
    const k = 1024;
    const sizes = [t('upload.fileSizeByte'), 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const stripPdfExtension = (fileName = '') => String(fileName).replace(/\.pdf$/i, '');