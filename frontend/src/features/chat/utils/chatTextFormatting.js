/**
 * ============================================
 *  Chat Text Formatting Tools
 *  Utilities for processing AI messages
 * ============================================
 * 
 * STRUCTURE:
 * - parseJsonObjectFromText: Extracts JSON from markdown
 * - normalizeAssistantText: Cleans output
 * - extractClauseReference: Finds legal clause mentions
 * - formatMessageTime: Localized time formatting
 * ============================================
 */


const parseJsonObjectFromText = (value) => {
    const text = String(value || '').trim();
    if (!text) return null;

    const withoutFence = text
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();

    const parseCandidates = [withoutFence, text];
    for (const candidate of parseCandidates) {
        if (!candidate) continue;

        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
            if (typeof parsed === 'string') {
                const nested = parseJsonObjectFromText(parsed);
                if (nested) return nested;
            }
        } catch {
            // Fall through to next parse strategy.
        }
    }

    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        const parsed = JSON.parse(match[0]);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const unwrapAssistantAnswerText = (rawText) => {
    let current = String(rawText || '').trim();
    if (!current) return '';

    for (let i = 0; i < 4; i += 1) {
        const parsed = parseJsonObjectFromText(current);
        if (!parsed) break;

        const nestedAnswer = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
        if (!nestedAnswer || nestedAnswer === current) {
            break;
        }

        current = nestedAnswer;
    }

    if (current.startsWith('```') || current.includes('"answer"')) {
        const match = current.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/);
        if (match) {
            try {
                const rescued = JSON.parse(`"${match[1]}"`);
                if (typeof rescued === 'string' && rescued.trim()) {
                    current = rescued.trim();
                }
            } catch {
                // Keep current value if unescape fails.
            }
        }
    }

    return current;
};

export const normalizeAssistantText = (rawText, originalQuestion = '') => {
    const text = unwrapAssistantAnswerText(rawText);
    if (!text) return '';

    const normalizedQuestion = String(originalQuestion || '').trim();
    const escapedQuestion = normalizedQuestion
        ? normalizedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : '';

    let cleaned = text
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .replace(/\r\n/g, '\n')
        // Remove markdown emphasis markers.
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        // Remove heading markers at line start.
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        // Remove horizontal rules.
        .replace(/^\s*([-*_])\1{2,}\s*$/gm, '')
        // Collapse overly large vertical gaps after markdown cleanup.
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (escapedQuestion) {
        // Remove prefixed question echoes such as "שאלה: ..." / "Question: ..." if they mirror user text.
        cleaned = cleaned
            .replace(new RegExp(`^\\s*(?:שאלה|question)\\s*[:\\-]\\s*${escapedQuestion}\\s*`, 'i'), '')
            .trim();
    }

    return cleaned;
};

export const extractClauseReference = (snippet) => {
    const text = String(snippet || '');
    if (!text) return '';

    const hebrewMatch = text.match(/(?:סעיף|סעיפים|ס׳|ס\.)\s*([0-9]{1,3}[א-ת]?)/i);
    if (hebrewMatch?.[1]) {
        return `סעיף ${hebrewMatch[1]}`;
    }

    const englishMatch = text.match(/clause\s*([0-9]{1,3}[a-z]?)/i);
    if (englishMatch?.[1]) {
        return `Clause ${englishMatch[1]}`;
    }

    return '';
};

export const formatMessageTime = (rawTime, locale) => {
    if (!rawTime) return '';
    const date = new Date(rawTime);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

