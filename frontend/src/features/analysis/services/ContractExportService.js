/**
 * ============================================
 * ContractExportService.js
 * Handles DOCX generation for the Final Edited Contract (RentGuard-360)
 * ============================================
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

import { inferIsHebrewDocument, normalizeExportTextForDocx, getDocumentDictionary, CONFIG } from '../utils/contractExportUtils';


const createTextRun = (text, dict, options = {}) => new TextRun({
    text,
    font: dict.font,
    language: { value: dict.language, bidirectional: dict.language },
    rightToLeft: dict.isRtl,
    ...options,
});

const createRunsPreservingNewlines = (text, dict, options = {}) => {
    const normalized = normalizeExportTextForDocx(text);

    const lines = normalized.split('\n');
    const runs = [];

    lines.forEach((line, index) => {
        runs.push(createTextRun(line, dict, options));
        if (index < lines.length - 1) {
            runs.push(new TextRun({
                text: '',
                break: 1,
                rightToLeft: dict.isRtl,
                font: dict.font,
                language: { value: dict.language, bidirectional: dict.language },
            }));
        }
    });

    return runs;
};

// --- Helper Functions ---
const createSignatureTable = (dict) => {
    const createCell = (title) => {
        return new TableCell({
            children: [
                new Paragraph({
                    children: [createTextRun(title, dict, { rightToLeft: dict.isRtl, bold: true })],
                    alignment: AlignmentType.CENTER,
                    bidirectional: dict.isRtl,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    children: [
                        createTextRun(dict.nameTitle, dict, { rightToLeft: dict.isRtl }),
                        createTextRun('________________', dict),
                    ],
                    alignment: AlignmentType.CENTER,
                    bidirectional: dict.isRtl,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [
                        createTextRun(dict.id, dict, { rightToLeft: dict.isRtl }),
                        createTextRun('________________', dict),
                    ],
                    alignment: AlignmentType.CENTER,
                    bidirectional: dict.isRtl,
                    spacing: { after: 200 },
                })
            ],
            borders: { top: { style: 'none' }, bottom: { style: 'none' }, left: { style: 'none' }, right: { style: 'none' } }
        });
    };

    const tenantCell = createCell(dict.tenant);
    const landlordCell = createCell(dict.landlord);

    const cells = dict.isRtl ? [tenantCell, landlordCell] : [landlordCell, tenantCell];

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        visuallyRightToLeft: dict.isRtl,
        rows: [new TableRow({ children: cells })],
    });
};

const createClauseParagraph = (text, wasEdited, originalNumber, dict) => {
    let displayText = normalizeExportTextForDocx(text).trim();

    // Prevent duplicate clause numbers
    if (wasEdited && originalNumber && !displayText.startsWith(originalNumber)) {
        displayText = `${originalNumber} ${displayText}`;
    }

    const isHeading = displayText.length < 60 && (displayText.endsWith(':') || displayText.match(/^\d+\./));

    return new Paragraph({
        children: createRunsPreservingNewlines(displayText, dict, {
            rightToLeft: dict.isRtl,
            bold: isHeading,
            size: 24, // 12pt
            highlight: wasEdited ? CONFIG.COLORS.HIGHLIGHT : undefined,
        }),
        bidirectional: dict.isRtl,
        // Do NOT set explicit alignment — bidirectional: true causes Word
        // to right-align natively.  Explicit jc=right can conflict.
        spacing: { after: CONFIG.SPACING.PARAGRAPH_AFTER, line: CONFIG.SPACING.LINE_HEIGHT },
    });
};

// --- Main Export Functions ---
export const exportEditedContractToWord = async (clauseTexts, editedClauses, fileName = 'RentGuard_Contract', options = {}) => {
    try {
        const sections = [];
        
        // Detect predominant language from multiple clauses (more robust than first clause only).
        const dict = getDocumentDictionary(inferIsHebrewDocument(clauseTexts));

        // 1. Header
        sections.push(
            new Paragraph({
                children: [createTextRun(dict.title, dict, { bold: true, rightToLeft: dict.isRtl })],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
            }),
            new Paragraph({
                children: [createTextRun(`${dict.datePrefix} ${new Date().toLocaleDateString(dict.dateLocale)}`, dict, { rightToLeft: dict.isRtl })],
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
                spacing: { after: CONFIG.SPACING.SECTION_BEFORE * 2 },
            })
        );

        // 2. Clauses
        clauseTexts.forEach((text, index) => {
            if (!text || text.trim() === '') return;

            const clauseId = `clause-${index}`;
            const edit = editedClauses ? editedClauses[clauseId] : null;        
            const wasEdited = edit && (edit.action === 'accepted' || edit.action === 'edited' || edit.action === 'shared-diff');

            sections.push(createClauseParagraph(text, wasEdited, edit?.originalNumber, dict));
        });

        // 3. Signatures
        sections.push(
            new Paragraph({ spacing: { before: 800 } }),
            new Paragraph({
                text: '─────────────────────────────────────────────────',
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [createTextRun(dict.signaturesTitle, dict, { bold: true, rightToLeft: dict.isRtl, size: 36 })],
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
                spacing: { before: 400, after: 400 },
            })
        );
        sections.push(createSignatureTable(dict));

        // Bottom Center Date
        sections.push(
            new Paragraph({ spacing: { before: 800 } }),
            new Paragraph({
                children: [
                    createTextRun(dict.dateLabel, dict, { rightToLeft: dict.isRtl }),
                    createTextRun('________________', dict),
                ],
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
            })
        );

        // Build Document
        //
        // RTL STRATEGY: Match the ReportExportService approach (proven to work).
        // Only set font/size in docDefaults.  Do NOT set paragraph defaults,
        // Normal style overrides, or explicit alignment — just rely on
        // per-paragraph bidirectional:true + per-run rightToLeft:true.
        // Word handles right-alignment natively when w:bidi is set.
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: dict.font,
                            size: 24, // 12pt
                        },
                    },
                },
            },
            sections: [{
                properties: {
                    page: { margin: { top: CONFIG.MARGINS.TOP, bottom: CONFIG.MARGINS.BOTTOM, left: CONFIG.MARGINS.LEFT, right: CONFIG.MARGINS.RIGHT } }
                },
                children: sections,
            }],
        });

        const blob = await Packer.toBlob(doc);
        if (options.asBlob) return blob;
        
        saveAs(blob, `${fileName}.docx`);
        return true;
    } catch (error) {
        console.error("Contract export failed:", error);
        throw new Error("Failed to generate contract document.");
    }
};

export const exportEditedContractToWordBlob = async (clauseTexts, editedClauses, fileName) => {
    return exportEditedContractToWord(clauseTexts, editedClauses, fileName, { asBlob: true });
};

const parseClausesForLegacyExport = (originalText, backendClauses = []) => {
    if (Array.isArray(backendClauses) && backendClauses.length > 0) {
        return backendClauses.map((text) => (typeof text === 'string' ? text.trim() : String(text || '').trim()));
    }

    if (!originalText) return [];

    return String(originalText)
        .split(/\n\n+|\n(?=\d+\.\s)/)
        .map((part) => part.trim())
        .filter(Boolean);
};

// Backward-compatible API used by AnalysisPage/AnalysisResults.
// eslint-disable-next-line no-unused-vars
export const exportEditedContract = async (originalText, editedClauses, _issues = [], fileName = 'Edited_Contract', backendClauses = [], options = {}) => {
    const clauseTexts = parseClausesForLegacyExport(originalText, backendClauses);
    return exportEditedContractToWord(clauseTexts, editedClauses || {}, fileName, options);
};

// eslint-disable-next-line no-unused-vars
const exportEditedContractToBlob = async (originalText, editedClauses, _issues = [], fileName = 'Edited_Contract', backendClauses = [], options = {}) => {
    return exportEditedContract(originalText, editedClauses, _issues, fileName, backendClauses, { asBlob: true });
};
