/**
 * ============================================
 *  Image Processing Service
 *  Webcam capture processing and compression
 * ============================================
 * 
 * STRUCTURE:
 * - Downscaling and Canvas operations
 * - JPEG compression
 * - Cropping orchestration
 * 
 * DEPENDENCIES:
 * - scannerAlgorithms
 * - scannerMathUtils
 * - Browser native APIs: Image, Canvas, Blob
 * ============================================
 */
import { applyAdaptiveSmartScan, perspectiveWarp } from '@/features/scanner/services/scannerAlgorithms';
import { getRectCorners } from '@/features/scanner/utils/scannerMathUtils';

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_JPEG_QUALITY = 0.82;
const MAX_PROCESSING_SIDE = 1600;

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

const scaleSourceForProcessing = (image) => {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const longest = Math.max(sourceWidth, sourceHeight);
    const scale = longest > MAX_PROCESSING_SIDE ? (MAX_PROCESSING_SIDE / longest) : 1;

    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        throw new Error('Unable to create processing canvas context.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    return {
        canvas,
        width,
        height,
        scale,
    };
};

const renderProcessedDataUrl = (rgba, width, height, quality = 0.96) => {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;

    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) {
        throw new Error('Unable to finalize processed image in browser canvas context.');
    }

    outputCtx.putImageData(new ImageData(rgba, width, height), 0, 0);
    return outputCanvas.toDataURL('image/jpeg', quality);
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

export const getCroppedImg = async (imageSrc, pixelCrop) => {
    if (!imageSrc || !pixelCrop) {
        throw new Error('Missing crop data for image processing.');
    }

    const image = await loadImage(imageSrc);
    const { canvas: sourceCanvas, width: srcWidth, height: srcHeight, scale } = scaleSourceForProcessing(image);
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceCtx) {
        throw new Error('Unable to process crop in browser canvas context.');
    }

    const sourceFrame = sourceCtx.getImageData(0, 0, srcWidth, srcHeight);
    const scaledCrop = {
        x: pixelCrop.x * scale,
        y: pixelCrop.y * scale,
        width: pixelCrop.width * scale,
        height: pixelCrop.height * scale,
    };

    const srcQuad = getRectCorners(scaledCrop);
    const warped = perspectiveWarp(sourceFrame.data, srcWidth, srcHeight, srcQuad);
    const enhanced = applyAdaptiveSmartScan(warped.data, warped.width, warped.height);
    return renderProcessedDataUrl(enhanced, warped.width, warped.height, 0.98);
};

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
