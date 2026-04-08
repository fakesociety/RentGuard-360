/**
 * Contract Text Processor
 * Cleans OCR-extracted text and fixes number positioning
 */

// Noise patterns to filter out
const NOISE_PATTERNS = [
    /^scanned\s+with/i,
    /camscanner/i,
    /^cs$/i,
    /^\.?[A-Za-z]\.?[A-Za-z]?\.?$/,
    /^[.\-_\s]+$/,
    /^ת\.ז\.?\s*$/,
    /^בין:?\s*$/,
    /^לבין:?\s*$/,
];

/**
 * Check if a line is OCR noise
 */
const isNoiseLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return true;
    return NOISE_PATTERNS.some(pattern => pattern.test(trimmed));
};

/**
 * Fix clause numbering - move numbers from end to beginning
 * Handles patterns like: "מטרת השכירות: .3" -> "3. מטרת השכירות:"
 * And: "השוכרים מתחייבים... 3.1" -> "3.1 השוכרים מתחייבים..."
 */
const fixClauseNumbering = (clause) => {
    if (!clause || typeof clause !== 'string') return clause;

    const normalizeLine = (rawLine) => {
        let line = rawLine.trim();
        if (!line) return line;

        // Pattern 1: Number at end like "...text .3" or "...text 3.1"
        // Restrict to clause-like numbers to avoid moving years/values.
        const endNumberPattern = /^(.+?)\s+(\.?\d{1,2}(?:\.\d{1,2}){0,2})\s*$/u;
        const match = line.match(endNumberPattern);

        if (match) {
            const content = match[1].trim();
            let number = match[2].trim();
            const hasHebrew = /[\u0590-\u05FF]/.test(content);
            const alreadyNumbered = /^\d{1,2}(?:\.\d{1,2})*\.?\s/.test(content);

            if (hasHebrew && !alreadyNumbered) {
                number = number.replace(/^\./, '');
                if (!number.endsWith('.')) {
                    number = `${number}.`;
                }
                line = `${number} ${content}`;
            }
        }

        // Pattern 2: Fix ".3 text" to "3. text" (period before number)
        line = line.replace(/^\.(\d{1,2}(?:\.\d{1,2}){0,2})\s+/, '$1. ');

        return line;
    };

    return clause
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(normalizeLine)
        .join('\n')
        .trim();
};

/**
 * Process clauses from backend - TRUST the backend structure
 * Only filter noise and fix number positioning
 */
export const processContractClauses = (clauses) => {
    if (!clauses || !Array.isArray(clauses)) return [];

    return clauses
        .filter(clause => {
            if (typeof clause !== 'string') return false;
            const trimmed = clause.trim();
            if (trimmed.length < 5) return false;
            return !isNoiseLine(trimmed);
        })
        .map(clause => fixClauseNumbering(clause.trim()));
};

/**
 * Detect primary language of text
 */
export const detectLanguage = (text) => {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    return hebrewChars > latinChars ? 'he' : 'en';
};

export default processContractClauses;
