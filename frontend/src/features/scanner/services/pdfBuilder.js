import { jsPDF } from 'jspdf';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image blob.'));
    reader.readAsDataURL(blob);
});

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load page image for PDF generation.'));
    img.src = src;
});

const fitWithinPage = (imgWidth, imgHeight, pageWidth, pageHeight, margin) => {
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const scale = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    return {
        drawWidth,
        drawHeight,
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
    };
};

export const buildPdfFileFromPages = async (pages, options = {}) => {
    if (!Array.isArray(pages) || pages.length === 0) {
        throw new Error('Add at least one scanned page before creating a PDF.');
    }

    const fileName = options.fileName || `scanned-contract-${Date.now()}.pdf`;
    const marginMm = options.marginMm ?? 10;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
    });

    for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];

        if (!page?.blob) {
            throw new Error('One of the scanned pages is missing image data.');
        }

        if (i > 0) {
            doc.addPage('a4', 'portrait');
        }

        const imageDataUrl = await blobToDataUrl(page.blob);
        const image = await loadImage(imageDataUrl);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const { drawWidth, drawHeight, x, y } = fitWithinPage(
            image.width,
            image.height,
            pageWidth,
            pageHeight,
            marginMm
        );

        doc.addImage(imageDataUrl, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
    }

    const pdfBlob = doc.output('blob');

    return new File([pdfBlob], fileName, {
        type: 'application/pdf',
        lastModified: Date.now(),
    });
};
