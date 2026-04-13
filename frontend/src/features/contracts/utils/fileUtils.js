/**
 * Utility functions for file names and extensions.
 */

// Gets the base file name without the `.pdf` extension for editing
export const normalizeDraftFileName = (fileName) => String(fileName || '').replace(/\.pdf$/i, '');

// Re-adds `.pdf` or appends it, using translation mechanism for fallback
export const normalizeFinalFileName = (rawFileName, t) => {
    const baseFileName = String(rawFileName || '').trim() || t('contracts.defaultFileName');
    return baseFileName.endsWith('.pdf') ? baseFileName : `${baseFileName}.pdf`;
};
