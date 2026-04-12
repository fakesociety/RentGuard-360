import { he } from '@/contexts/LanguageContext/he';
import { en } from '@/contexts/LanguageContext/en';

// RTL alignment: let Word handle it naturally via w:bidi on paragraphs.
// Do NOT set explicit w:jc=right — bidi already implies right alignment
// and explicit values can cause rendering conflicts in some Word versions.
const HEBREW_CHARS_PATTERN = /[\u0590-\u05FF]/g;
const LATIN_CHARS_PATTERN = /[A-Za-z]/g;
const RTL_CONTRACT_KEYWORDS = ['חוזה', 'הסכם', 'שכירות', 'משכיר', 'שוכר', 'הואיל', 'לפיכך'];

// --- Constants ---
export const CONFIG = {
    COLORS: { HIGHLIGHT: 'yellow' },
    SPACING: {
        PARAGRAPH_AFTER: 300,
        LINE_HEIGHT: 360, // 1.5 line spacing
        SECTION_BEFORE: 400,
    },
    MARGINS: { TOP: 1440, BOTTOM: 1440, LEFT: 1440, RIGHT: 1440 } // 1 inch margins
};

// --- Language Detection & Dictionary ---
export const detectHebrew = (text) => /[\u0590-\u05FF]/.test(text || '');

export const inferIsHebrewDocument = (clauseTexts = []) => {
    const sample = (Array.isArray(clauseTexts) ? clauseTexts : [])
        .filter((line) => typeof line === 'string' && line.trim().length > 0)
        .slice(0, 40)
        .join('\n')
        .slice(0, 12000);

    if (!sample || !detectHebrew(sample)) {
        return false;
    }

    const hebrewChars = (sample.match(HEBREW_CHARS_PATTERN) || []).length;
    const latinChars = (sample.match(LATIN_CHARS_PATTERN) || []).length;
    const hasHebrewContractKeyword = RTL_CONTRACT_KEYWORDS.some((keyword) => sample.includes(keyword));

    if (latinChars === 0) {
        return hebrewChars > 0;
    }

    if (hasHebrewContractKeyword && hebrewChars >= 10) {
        return true;
    }

    return hebrewChars / (hebrewChars + latinChars) >= 0.3;
};

export const normalizeExportTextForDocx = (text) => {
    return String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]{2,}/g, ' ');
};

export const getDocumentDictionary = (isHebrew) => {
    const localeStrings = isHebrew ? he.contractExport : en.contractExport;     
    return {
        isRtl: isHebrew,
        font: isHebrew ? 'David' : 'Arial',
        language: isHebrew ? 'he-IL' : 'en-US',
        title: localeStrings.title,
        datePrefix: localeStrings.datePrefix,
        signaturesTitle: localeStrings.signaturesTitle,
        tenant: localeStrings.tenant,
        landlord: localeStrings.landlord,
        id: localeStrings.id,
        nameTitle: localeStrings.nameTitle,
        dateLabel: localeStrings.dateLabel,
        dateLocale: isHebrew ? 'he-IL' : 'en-US'
    };
};

export const getReportDictionary = (isHebrew) => {
    const localeStrings = isHebrew ? he.reportExport : en.reportExport;
    return {
        isRtl: isHebrew,
        font: isHebrew ? 'David' : 'Arial',
        language: isHebrew ? 'he-IL' : 'en-US',
        title: localeStrings.title,
        generatedOn: localeStrings.generatedOn,
        generalRiskAssessment: localeStrings.generalRiskAssessment,
        riskScore: localeStrings.riskScore,
        breakdownByCategory: localeStrings.breakdownByCategory,
        category: localeStrings.category,
        score: localeStrings.score,
        issuesFound: localeStrings.issuesFound,
        riskLevel: localeStrings.riskLevel,
        penalty: localeStrings.penalty,
        explanation: localeStrings.explanation,
        categories: localeStrings.categories
    };
};

