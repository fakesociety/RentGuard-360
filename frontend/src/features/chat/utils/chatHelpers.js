/**
 * ============================================
 * Chat Helper Utilities
 * System logic, analytics tracking, and preferences
 * ============================================
 */

const CHAT_AUTO_OPEN_PREF_KEY = 'rentguard_chat_auto_open_contract';

export const isContractChatAutoOpenEnabled = () => {
    try {
        const saved = localStorage.getItem(CHAT_AUTO_OPEN_PREF_KEY);
        if (saved === null) return true;
        return saved !== 'false';
    } catch {
        return true;
    }
};

export const getAnalysisContractIdFromPath = (pathname) => {
    const match = String(pathname || '').match(/^\/analysis\/([^/?#]+)/);
    if (!match || !match[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

export const looksLikeMachineId = (value) => {
    const text = String(value || '').trim();
    if (!text) return true;

    // Common UUID-like Cognito identifiers.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
        return true;
    }

    // Provider-prefixed IDs or long opaque tokens.
    if (text.includes('|') || text.length > 28) {
        return true;
    }

    return false;
};

export const trackChatEvent = (eventName, payload = {}) => {
    const detail = {
        event: eventName,
        timestamp: Date.now(),
        ...payload,
    };

    window.dispatchEvent(new CustomEvent('rg:chat-analytics', { detail }));

    if (import.meta.env.DEV) {
        console.debug('chat-analytics', detail);
    }
};