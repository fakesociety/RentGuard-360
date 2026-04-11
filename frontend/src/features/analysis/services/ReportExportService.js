/**
 * ============================================
 * ReportExportService.js
 * Handles Word generation for the AI Contract Analysis Report (RentGuard-360)
 * ============================================
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { getReportDictionary, detectHebrew } from '../utils/contractExportUtils';

const createTextRun = (text, dict, options = {}) => new TextRun({
    text: String(text ?? ''),
    font: dict.font,
    language: { value: dict.language, bidirectional: dict.language },
    rightToLeft: dict.isRtl,
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

        // Detect language based on summary
        const isHebrew = detectHebrew(summary);
        const dict = getReportDictionary(isHebrew);

        const sections = [];

        // 1. Title
        sections.push(
            new Paragraph({
                children: [createTextRun(dict.title, dict, { bold: true })],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
            }),
            new Paragraph({
                children: [createTextRun(dict.generatedOn + new Date().toLocaleDateString(isHebrew ? 'he-IL' : 'en-US'), dict)],
                alignment: AlignmentType.CENTER,
                bidirectional: dict.isRtl,
                spacing: { after: 400 },
            })
        );

        // 2. Risk Score & Summary
        sections.push(
            new Paragraph({
                children: [createTextRun(dict.generalRiskAssessment, dict, { bold: true })],
                heading: HeadingLevel.HEADING_1,
                bidirectional: dict.isRtl,
            }),
            new Paragraph({
                children: [
                    createTextRun(dict.riskScore, dict, { bold: true }),
                    createTextRun(riskScore + '/100', dict, { bold: true, size: 32 }),
                ],
                bidirectional: dict.isRtl,
                spacing: { after: 200 },
            }),
            new Paragraph({
                children: [createTextRun(summary, dict)],
                bidirectional: dict.isRtl,
                spacing: { after: 400 },
            })
        );

        // 3. Breakdown Table
        if (Object.keys(breakdown).length > 0) {
            sections.push(new Paragraph({
                children: [createTextRun(dict.breakdownByCategory, dict, { bold: true })],
                heading: HeadingLevel.HEADING_2,
                bidirectional: dict.isRtl,
            }));

            const tableRows = [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [createTextRun(dict.category, dict, { bold: true })],
                                alignment: AlignmentType.CENTER,
                                bidirectional: dict.isRtl,
                            })],
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                children: [createTextRun(dict.score, dict, { bold: true })],
                                alignment: AlignmentType.CENTER,
                                bidirectional: dict.isRtl,
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
                                    children: [createTextRun(dict.categories[key] || key, dict)],
                                    bidirectional: dict.isRtl,
                                })],
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [createTextRun((data.score || 0) + '/20', dict)],
                                    alignment: AlignmentType.CENTER,
                                    bidirectional: dict.isRtl,
                                })],
                            }),
                        ],
                    })
                );
            });

            sections.push(
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows, visuallyRightToLeft: dict.isRtl }),
                new Paragraph({ spacing: { after: 400 } })
            );
        }

        // 4. Issues List
        if (issues.length > 0) {
            sections.push(new Paragraph({
                children: [createTextRun(dict.issuesFound + ' (' + issues.length + ')', dict, { bold: true })],
                heading: HeadingLevel.HEADING_1,
                bidirectional: dict.isRtl,
            }));

            issues.forEach((issue, idx) => {
                sections.push(
                    new Paragraph({
                        children: [createTextRun((idx + 1) + '. ' + (issue.clause_topic || 'Issue'), dict)],
                        heading: HeadingLevel.HEADING_2,
                        bidirectional: dict.isRtl,
                    }),
                    new Paragraph({
                        children: [
                            createTextRun(dict.riskLevel, dict, { bold: true }),
                            createTextRun(issue.risk_level || 'Medium', dict),
                            issue.penalty_points ? createTextRun(dict.penalty + issue.penalty_points, dict) : null
                        ].filter(Boolean),
                        bidirectional: dict.isRtl,
                        spacing: { after: 200 },
                    })
                );

                if (issue.explanation) {
                    sections.push(
                        new Paragraph({
                            children: [
                                createTextRun(dict.explanation, dict, { bold: true }),
                                createTextRun(issue.explanation, dict),
                            ],
                            bidirectional: dict.isRtl,
                            spacing: { after: 300 },
                        })
                    );
                }
            });
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: dict.font,
                            size: 24,
                        },
                    },
                },
            },
            sections: [{ children: sections }],
        });
        const blob = await Packer.toBlob(doc);
        
        if (options.asBlob) return blob;
        saveAs(blob, fileName + '.docx');
        return true;

    } catch (error) {
        console.error('Report export failed:', error);
        throw new Error('Failed to generate report document.');
    }
};

export const exportReportToWordBlob = async (analysis, fileName) => {
    return exportReportToWord(analysis, fileName, { asBlob: true });
};

export default {
    exportReportToWord,
    exportReportToWordBlob
};
