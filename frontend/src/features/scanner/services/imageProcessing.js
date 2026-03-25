const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_JPEG_QUALITY = 0.76;

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load captured image.'));
    img.src = src;
});

const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
};

const drawDownscaledImage = (img, maxWidth) => {
    const safeMaxWidth = Number.isFinite(maxWidth) ? maxWidth : DEFAULT_MAX_WIDTH;
    const scale = img.width > safeMaxWidth ? safeMaxWidth / img.width : 1;
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Unable to process image in browser canvas context.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return { canvas, width: targetWidth, height: targetHeight };
};

const canvasToJpegBlob = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(
        (blob) => {
            if (!blob) {
                reject(new Error('Failed to encode captured image.'));
                return;
            }
            resolve(blob);
        },
        'image/jpeg',
        quality
    );
});

export const compressCaptureDataUrl = async (dataUrl, options = {}) => {
    if (!dataUrl) {
        throw new Error('Camera did not return image data.');
    }

    const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
    const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

    const sourceBlob = await dataUrlToBlob(dataUrl);
    const sourceUrl = URL.createObjectURL(sourceBlob);

    try {
        const img = await loadImage(sourceUrl);
        const { canvas, width, height } = drawDownscaledImage(img, maxWidth);
        const blob = await canvasToJpegBlob(canvas, quality);
        const url = URL.createObjectURL(blob);

        return {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            blob,
            url,
            width,
            height,
            createdAt: Date.now(),
        };
    } finally {
        URL.revokeObjectURL(sourceUrl);
    }
};

export const revokeImageUrl = (page) => {
    if (page?.url) {
        URL.revokeObjectURL(page.url);
    }
};

export const totalBytesForPages = (pages) => pages.reduce((sum, page) => sum + (page?.blob?.size || 0), 0);
