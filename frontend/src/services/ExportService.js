/**
 * ExportService - Generate Word and PDF reports from contract analysis
 * Supports Hebrew text with RTL formatting
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

/**
 * Export analysis to Word document (Full Hebrew Support)
 */
export const exportToWord = async (analysis, fileName = 'Contract_Analysis_Report') => {
    const result = analysis?.analysis_result || analysis;
    const riskScore = result?.overall_risk_score || 0;
    const issues = result?.issues || [];
    const summary = result?.summary || 'Analysis complete.';
    const breakdown = result?.score_breakdown || {};

    // Create document sections
    const sections = [];

    // Title - Hebrew RTL
    sections.push(
        new Paragraph({
            text: 'דוח ניתוח חוזה שכירות',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        }),
        new Paragraph({
            text: `Contract Analysis Report`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: `נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')}`,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Overall Score
    sections.push(
        new Paragraph({
            text: 'הערכת סיכון כללית',
            heading: HeadingLevel.HEADING_1,
            bidirectional: true,
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'ציון סיכון: ', bold: true, rightToLeft: true }),
                new TextRun({ text: `${riskScore}/100`, bold: true, size: 32 }),
            ],
            bidirectional: true,
            spacing: { after: 200 },
        }),
        new Paragraph({
            text: summary,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Score Breakdown Table
    if (Object.keys(breakdown).length > 0) {
        sections.push(
            new Paragraph({
                text: 'פירוט ציון לפי קטגוריות',
                heading: HeadingLevel.HEADING_2,
                bidirectional: true,
            })
        );

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
                    new TableCell({ children: [new Paragraph({ text: 'קטגוריה', bold: true })] }),
                    new TableCell({ children: [new Paragraph({ text: 'ציון', bold: true })] }),
                ],
            }),
        ];

        Object.entries(breakdown).forEach(([key, data]) => {
            tableRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(categoryNames[key] || key)] }),
                        new TableCell({ children: [new Paragraph(`${data.score || 0}/20`)] }),
                    ],
                })
            );
        });

        sections.push(
            new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({ spacing: { after: 400 } })
        );
    }

    // Issues Section
    if (issues.length > 0) {
        sections.push(
            new Paragraph({
                text: `בעיות שנמצאו (${issues.length})`,
                heading: HeadingLevel.HEADING_1,
                bidirectional: true,
            })
        );

        issues.forEach((issue, idx) => {
            sections.push(
                new Paragraph({
                    text: `${idx + 1}. ${issue.clause_topic}`,
                    heading: HeadingLevel.HEADING_2,
                    bidirectional: true,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'רמת סיכון: ', bold: true, rightToLeft: true }),
                        new TextRun({ text: issue.risk_level || 'Medium' }),
                        issue.rule_id && new TextRun({ text: ` | כלל: ${issue.rule_id}` }),
                        issue.penalty_points && new TextRun({ text: ` | קנס: -${issue.penalty_points}` }),
                    ].filter(Boolean),
                    bidirectional: true,
                })
            );

            if (issue.original_text) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'סעיף מקורי: ', bold: true, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    }),
                    new Paragraph({
                        text: `"${issue.original_text}"`,
                        italics: true,
                        bidirectional: true,
                        spacing: { after: 100 },
                    })
                );
            }

            if (issue.legal_basis) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'בסיס חוקי: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.legal_basis, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    })
                );
            }

            if (issue.explanation) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'הסבר: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.explanation, rightToLeft: true }),
                        ],
                        bidirectional: true,
                    })
                );
            }

            if (issue.suggested_fix) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'הצעה לתיקון: ', bold: true, rightToLeft: true }),
                            new TextRun({ text: issue.suggested_fix, rightToLeft: true }),
                        ],
                        bidirectional: true,
                        spacing: { after: 300 },
                    })
                );
            }
        });
    }

    // Create and save document
    const doc = new Document({
        sections: [{
            properties: {},
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

/**
 * Export analysis to PDF document
 * Note: For Hebrew, use Word export for better formatting
 * PDF uses basic visualization without Hebrew text
 */
export const exportToPDF = async (analysis, fileName = 'Contract_Analysis_Report') => {
    const result = analysis?.analysis_result || analysis;
    const riskScore = result?.overall_risk_score || 0;
    const issues = result?.issues || [];
    const breakdown = result?.score_breakdown || {};

    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 2 * margin;

    // Helper to add new page if needed
    const checkPageBreak = (neededHeight = 20) => {
        if (y + neededHeight > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20;
        }
    };

    // Title - English for PDF (Hebrew not supported)
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('Contract Analysis Report', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.text('For Hebrew content, please use Word export', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Risk Score - Visual representation
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Risk Score', margin, y);
    y += 10;

    // Draw score bar
    const barWidth = 100;
    const barHeight = 20;
    const scoreWidth = (riskScore / 100) * barWidth;

    // Background bar
    doc.setFillColor(60, 60, 60);
    doc.roundedRect(margin, y, barWidth, barHeight, 3, 3, 'F');

    // Score fill
    const scoreColor = riskScore >= 70 ? [220, 53, 69] : riskScore >= 40 ? [255, 193, 7] : [40, 167, 69];
    doc.setFillColor(...scoreColor);
    doc.roundedRect(margin, y, scoreWidth, barHeight, 3, 3, 'F');

    // Score text
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`${riskScore}/100`, margin + 5, y + 14);
    doc.setTextColor(0, 0, 0);
    y += barHeight + 15;

    // Category Scores
    const categoryNames = {
        financial_terms: 'Financial Terms',
        tenant_rights: 'Tenant Rights',
        termination_clauses: 'Termination & Exit',
        liability_repairs: 'Liability & Repairs',
        legal_compliance: 'Legal Compliance',
    };

    if (Object.keys(breakdown).length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Category Breakdown', margin, y);
        y += 8;

        Object.entries(breakdown).forEach(([key, data]) => {
            const score = data.score || 0;
            const catBarWidth = 60;
            const catScoreWidth = (score / 20) * catBarWidth;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`${categoryNames[key] || key}:`, margin, y + 5);

            // Mini bar
            doc.setFillColor(60, 60, 60);
            doc.roundedRect(margin + 80, y, catBarWidth, 8, 2, 2, 'F');

            const catColor = score >= 16 ? [40, 167, 69] : score >= 10 ? [255, 193, 7] : [220, 53, 69];
            doc.setFillColor(...catColor);
            doc.roundedRect(margin + 80, y, catScoreWidth, 8, 2, 2, 'F');

            doc.text(`${score}/20`, margin + 145, y + 5);
            y += 12;
        });
        y += 10;
    }

    // Issues Summary (no Hebrew)
    if (issues.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Issues Found: ${issues.length}`, margin, y);
        y += 8;

        issues.forEach((issue, idx) => {
            checkPageBreak(20);
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            const riskColor = issue.risk_level === 'High' ? [220, 53, 69] :
                issue.risk_level === 'Medium' ? [255, 193, 7] : [40, 167, 69];
            doc.setTextColor(...riskColor);
            doc.text(`[${issue.risk_level || 'Medium'}]`, margin, y);
            doc.setTextColor(0, 0, 0);

            // Topic in English or show "(Hebrew)"
            const topic = /[\u0590-\u05FF]/.test(issue.clause_topic) ?
                `Issue ${idx + 1} (see Word for details)` : issue.clause_topic;
            doc.text(topic, margin + 25, y);

            if (issue.penalty_points) {
                doc.setTextColor(220, 53, 69);
                doc.text(`-${issue.penalty_points} pts`, pageWidth - margin - 20, y);
                doc.setTextColor(0, 0, 0);
            }
            y += 7;
        });
    }

    // Footer note
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('For full Hebrew support, please export to Word (.docx)', pageWidth / 2, y, { align: 'center' });

    // Save
    doc.save(`${fileName}.pdf`);
};

/**
 * Export edited contract to Word with Hebrew RTL support
 * @param {string} originalText - Original contract text
 * @param {object} editedClauses - Object with clauseId -> { text, action }
 * @param {array} issues - Issues with suggested fixes
 * @param {string} fileName - Output file name
 */
export const exportEditedContract = async (originalText, editedClauses, issues = [], fileName = 'Edited_Contract') => {
    const sections = [];

    // Title
    sections.push(
        new Paragraph({
            text: 'חוזה שכירות מתוקן',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        }),
        new Paragraph({
            text: `נערך בתאריך: ${new Date().toLocaleDateString('he-IL')}`,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
        })
    );

    // Summary of changes
    const changesCount = Object.keys(editedClauses).length;
    if (changesCount > 0) {
        sections.push(
            new Paragraph({
                text: `סיכום שינויים: ${changesCount} סעיפים נערכו`,
                bidirectional: true,
                spacing: { after: 200 },
            })
        );
    }

    // Parse and rebuild contract with edits applied
    const clauses = originalText
        .split(/\n\n+|\n(?=\d+\.\s)/)
        .filter(p => p.trim().length > 0);

    clauses.forEach((clauseText, index) => {
        const clauseId = `clause-${index}`;
        const edit = editedClauses[clauseId];

        // Determine final text
        let finalText = clauseText.trim();
        let wasEdited = false;

        if (edit) {
            if (edit.action === 'accepted' || edit.action === 'edited') {
                finalText = edit.text;
                wasEdited = true;
            }
        }

        // Add clause to document (no § prefix since text already has numbering)
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: finalText,
                        rightToLeft: true,
                        highlight: wasEdited ? 'yellow' : undefined, // Highlight edited clauses
                    }),
                ],
                bidirectional: true,
                spacing: { after: 200 },
            })
        );

        // Note if clause was changed
        if (wasEdited) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `[סעיף זה ${edit.action === 'accepted' ? 'אושר עם תיקון AI' : 'נערך ידנית'}]`,
                            italics: true,
                            size: 20,
                            color: '666666',
                            rightToLeft: true,
                        }),
                    ],
                    bidirectional: true,
                    spacing: { after: 100 },
                })
            );
        }
    });

    // Footer
    sections.push(
        new Paragraph({
            text: '---',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
            text: 'RentGuard 360 מסמך זה נוצר באמצעות',
            alignment: AlignmentType.CENTER,
            bidirectional: true,
        })
    );

    // Create and save document
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, bottom: 720, left: 720, right: 720 },
                }
            },
            children: sections,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};

export default {
    exportToWord,
    exportToPDF,
    exportEditedContract,
};
