/**
 * ============================================
 * ReportExportService.js
 * Handles Word generation for the AI Contract Analysis Report (RentGuard-360)
 * ============================================
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const getDocumentFont = (text) => {
    return /[\u0590-\u05FF]/.test(text || '') ? 'David' : 'Arial';
};

const createTextRun = (text, options = {}, font = 'David') => new TextRun({
    text,
    font: font,
    ...options,
});

// ============================================
// WORD EXPORT (AI ANALYSIS REPORT)
// ============================================

export const exportReportToWord = async (analysis, fileName = 'Contract_Analysis_Report', options = {}) => {
    try {
        const result = analysis?.analysis_result || analysis;
        const riskScore = result?.overall_risk_score || 0;
        const issues = result?.issues || [];
        const summary = result?.summary || 'Analysis complete.';
        const breakdown = result?.score_breakdown || {};

        const sections = [];

        // 1. Title
        sections.push(
            new Paragraph({
                children: [createTextRun('דוח ניתוח חוזה שכירות', { bold: true, rightToLeft: true })],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                bidirectional: true,
            }),
            new Paragraph({
                children: [createTextRun(`נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')}`, { rightToLeft: true })],
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { after: 400 },
            })
        );

        // 2. Risk Score & Summary
        sections.push(
            new Paragraph({
                children: [createTextRun('הערכת סיכון כללית', { bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_1,
                bidirectional: true,
            }),
            new Paragraph({
                children: [
                    createTextRun('ציון סיכון: ', { bold: true, rightToLeft: true }),
                    createTextRun(`${riskScore}/100`, { bold: true, size: 32 }),
                ],
                bidirectional: true,
                spacing: { after: 200 },
            }),
            new Paragraph({
                children: [createTextRun(summary, { rightToLeft: true })],
                bidirectional: true,
                spacing: { after: 400 },
            })
        );

        // 3. Breakdown Table
        if (Object.keys(breakdown).length > 0) {
            sections.push(new Paragraph({
                children: [createTextRun('פירוט ציון לפי קטגוריות', { bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                bidirectional: true,
            }));
            
            const categoryNames = {
                financial_terms: 'תנאים פיננסיים',
                tenant_rights: 'זכויות הדייר',
                termination_clauses: 'סיום ויציאה',
                liability_repairs: 'אחריות ותיקונים',
                legal_compliance: 'עמידה בחוק',
            };

            const tableRows = [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [createTextRun('קטגוריה', { bold: true, rightToLeft: true })],
                                alignment: AlignmentType.CENTER,
                            })],
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                children: [createTextRun('ציון', { bold: true, rightToLeft: true })],
                                alignment: AlignmentType.CENTER,
                            })],
                        }),
                    ],
                }),
            ];

            Object.entries(breakdown).forEach(([key, data]) => {
                tableRows.push(
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({
                                    children: [createTextRun(categoryNames[key] || key, { rightToLeft: true })],
                                    bidirectional: true,
                                })],
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [createTextRun(`${data.score || 0}/20`)],
                                    alignment: AlignmentType.CENTER,
                                })],
                            }),
                        ],
                    })
                );
            });

            sections.push(
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
                new Paragraph({ spacing: { after: 400 } })
            );
        }

        // 4. Issues List
        if (issues.length > 0) {
            sections.push(new Paragraph({
                children: [createTextRun(`בעיות שנמצאו (${issues.length})`, { bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_1,
                bidirectional: true,
            }));

            issues.forEach((issue, idx) => {
                sections.push(
                    new Paragraph({
                        children: [createTextRun(`${idx + 1}. ${issue.clause_topic || 'Issue'}`, { rightToLeft: true })],
                        heading: HeadingLevel.HEADING_2,
                        bidirectional: true,
                    }),
                    new Paragraph({
                        children: [
                            createTextRun('רמת סיכון: ', { bold: true, rightToLeft: true }),
                            createTextRun(issue.risk_level || 'Medium'),
                            issue.penalty_points ? createTextRun(` | קנס: -${issue.penalty_points}`) : null
                        ].filter(Boolean),
                        bidirectional: true,
                        spacing: { after: 200 },
                    })
                );

                if (issue.explanation) {
                    sections.push(
                        new Paragraph({
                            children: [
                                createTextRun('הסבר: ', { bold: true, rightToLeft: true }),
                                createTextRun(issue.explanation, { rightToLeft: true }),
                            ],
                            bidirectional: true,
                            spacing: { after: 300 },
                        })
                    );
                }
            });
        }

        const docFont = getDocumentFont(summary);

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: docFont,
                            size: 24,
                        },
                    },
                },
            },
            sections: [{ children: sections }],
        });
        const blob = await Packer.toBlob(doc);
        
        if (options.asBlob) return blob;
        saveAs(blob, `${fileName}.docx`);
        return true;

    } catch (error) {
        console.error("Report export failed:", error);
        throw new Error("Failed to generate report document.");
    }
};

export const exportReportToWordBlob = async (analysis, fileName) => {
    return exportReportToWord(analysis, fileName, { asBlob: true });
};

export default {
    exportReportToWord,
    exportReportToWordBlob
};