/**
 * ============================================
 *  Contract Text Processor
 *  Cleans OCR-extracted text and fixes number positioning
 * ============================================
 * 
 * STRUCTURE:
 * - isNoiseLine: Detects OCR garbage
 * - fixClauseNumbering: Re-orders RTL numbering 
 * - processContractClauses: Main exported cleaner
 * 
 * ============================================
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

    let fullClause = clause.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // Pattern for block-wide trailing number (e.g. text...\n\n.11)
    const blockEndNumberPattern = /^([\s\S]+?)\s+(\.?\d{1,2}(?:\.\d{1,2}){0,2}\.?)$/u;
    const blockMatch = fullClause.match(blockEndNumberPattern);
    if (blockMatch) {
        let content = blockMatch[1].trim();
        let number = blockMatch[2].trim();
        const hasHebrew = /[\u0590-\u05FF]/.test(content);
        const alreadyNumbered = /^\d{1,2}(?:\.\d{1,2})*\.?\s/.test(content);

        if (hasHebrew && !alreadyNumbered) {
            number = number.replace(/^\./, '').replace(/\.$/, '');
            fullClause = `${number}. ${content}`;
        }
    }

    const lines = fullClause.split('\n');
    const mergedLines = [];
    let pendingNum = '';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        if (/^\.?\d{1,2}(?:\.\d{1,2}){0,2}\.?$/.test(line)) {
            pendingNum = pendingNum ? `${pendingNum} ${line}` : line;
        } else {
            if (pendingNum) {
                line = `${pendingNum} ${line}`;
                pendingNum = '';
            }
            mergedLines.push(line);
        }
    }
    if (pendingNum) mergedLines.push(pendingNum);

    const normalizeLine = (rawLine) => {
        let line = rawLine;

        // Pattern 1: Number at end like "...text .3" or "...text 3.1"
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
        line = line.replace(/^\.(\d{1,2}(?:\.\d{1,2}){0,2})(?:\s+|$)/, '$1. ');
        
        // Pattern 3: Ensure there is a space after the number if it is at the start (e.g. "14.text" -> "14. text")
        line = line.replace(/^(\d{1,2}(?:\.\d{1,2}){0,2}\.)([^\s])/, '$1 $2');

        return line;
    };

    return mergedLines
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

    let filtered = clauses.filter(clause => {
        if (typeof clause !== 'string') return false;
        const trimmed = clause.trim();
        // Allow very short clauses if they are just a clause number (like "1.", "3.1")
        const isJustNumber = /^\.?\d{1,2}(?:\.\d{1,2}){0,2}\.?$/.test(trimmed);
        if (trimmed.length < 5 && !isJustNumber) return false;
        return !isNoiseLine(trimmed);
    });

    const mergedClauses = [];
    let pendingNumber = '';

    for (let i = 0; i < filtered.length; i++) {
        let current = filtered[i].trim();
        
        // If it's a standalone number, accumulate it and merge with the next real clause
        if (/^\.?\d{1,2}(?:\.\d{1,2}){0,2}\.?$/.test(current)) {
            pendingNumber = pendingNumber ? `${pendingNumber} ${current}` : current;
        } else {
            if (pendingNumber) {
                current = `${pendingNumber} ${current}`;
                pendingNumber = '';
            }
            mergedClauses.push(current);
        }
    }

    if (pendingNumber) {
        mergedClauses.push(pendingNumber);
    }

    return mergedClauses.map(clause => fixClauseNumbering(clause.trim()));
};

