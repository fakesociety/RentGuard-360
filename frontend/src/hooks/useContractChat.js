import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { askContractQuestion, clearContractChatHistory, getContractChatHistory, getContracts } from '../services/api';
import { isContractChatAutoOpenEnabled, getAnalysisContractIdFromPath, normalizeAssistantText, looksLikeMachineId } from '../utils/chatTextFormatting';

const CHAT_PANEL_CLOSE_MS = 260;

export function useContractChat() {
    const { isAuthenticated, user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const location = useLocation();

    const [open, setOpen] = useState(false);
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [selectedContractId, setSelectedContractId] = useState('');
    const [messages, setMessages] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [errorKey, setErrorKey] = useState('');
    const [copiedMessageKey, setCopiedMessageKey] = useState('');
    const [responseHintKey, setResponseHintKey] = useState('');
    const [rateLimitRetryAt, setRateLimitRetryAt] = useState(0);
    const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isContractMenuOpen, setIsContractMenuOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [footerOffset, setFooterOffset] = useState(24);
    const [useWhyPalette, setUseWhyPalette] = useState(false);
    const lastAutoOpenedPathRef = useRef('');
    const widgetRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const closeTimerRef = useRef(null);

    const userLabel = useMemo(() => {
        if (userAttributes?.name) return userAttributes.name;
        if (typeof userAttributes?.email === 'string' && userAttributes.email.includes('@')) {
            return userAttributes.email.split('@')[0];
        }
        if (user?.name) return user.name;
        if (user?.fullName) return user.fullName;
        if (user?.given_name) return user.given_name;
        if (typeof user?.email === 'string' && user.email.includes('@')) {
            return user.email.split('@')[0];
        }

        if (user?.username && !looksLikeMachineId(user.username)) {
            return user.username;
        }

        return t('common.user');
    }, [userAttributes, user, t]);

    const userInitial = String(userLabel).trim().charAt(0).toUpperCase() || 'U';
    const locale = isRTL ? 'he-IL' : 'en-US';

    const quickPrompts = useMemo(() => ([
        t('chat.promptHighRisk'),
        t('chat.promptPets'),
        t('chat.promptTermination'),
    ]), [t]);

    const selectedContractLabel = useMemo(() => {
        if (loadingContracts) return t('chat.loadingContracts');
        if (!selectedContractId) return t('chat.selectContract');

        const selected = contracts.find((contract) => contract.contractId === selectedContractId);
        return selected?.fileName || selected?.contractId || t('chat.selectContract');
    }, [contracts, loadingContracts, selectedContractId, t]);

    const routeContractId = useMemo(() => getAnalysisContractIdFromPath(location.pathname), [location.pathname]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!routeContractId) return;
        if (!isContractChatAutoOpenEnabled()) return;

        const currentPath = location.pathname;
        if (lastAutoOpenedPathRef.current === currentPath) {
            return;
        }

        setOpen(true);
        lastAutoOpenedPathRef.current = currentPath;
    }, [isAuthenticated, routeContractId, location.pathname]);

    const trackChatEvent = (eventName, payload = {}) => {
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

    const isRateLimitError = (error) => {
        const text = String(error?.message || error || '').toLowerCase();
        return (
            text.includes('429') ||
            text.includes('too many requests') ||
            text.includes('rate limit') ||
            text.includes('rate-limit') ||
            text.includes('קצב')
        );
    };

    useEffect(() => {
        if (open) {
            trackChatEvent('chat_opened', { route: location.pathname });
        }
    }, [open, location.pathname]);

    useEffect(() => {
        const updateFooterOffset = () => {
            const baseOffset = window.innerWidth <= 768 ? 12 : 24;
            const shouldPinToViewportBottom = open && window.innerWidth <= 768;

            if (shouldPinToViewportBottom) {
                setFooterOffset(baseOffset);
                return;
            }

            const footer = document.querySelector('.app-footer');
            if (!footer) {
                setFooterOffset(baseOffset);
                return;
            }

            const footerRect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - footerRect.top);
            setFooterOffset(baseOffset + overlap);
        };

        updateFooterOffset();
        window.addEventListener('scroll', updateFooterOffset, { passive: true });
        window.addEventListener('resize', updateFooterOffset);

        return () => {
            window.removeEventListener('scroll', updateFooterOffset);
            window.removeEventListener('resize', updateFooterOffset);
        };
    }, [open]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const updatePaletteBySection = () => {
            const isDashboardRoute = location.pathname === '/dashboard';
            if (!isDashboardRoute) {
                setUseWhyPalette(false);
                return;
            }

            const whySectionNode = document.querySelector('.why-rentguard-section');
            const footerNode = document.querySelector('.app-footer');

            const headerNode = document.querySelector('.chat-widget-header');
            const launcherNode = document.querySelector('.chat-widget-launcher');

            const targetNode = open ? headerNode : launcherNode;

            if (!targetNode) return;

            const targetRect = targetNode.getBoundingClientRect();
            let intersects = false;

            if (whySectionNode) {
                const sectionRect = whySectionNode.getBoundingClientRect();
                if (targetRect.bottom >= sectionRect.top && targetRect.top <= sectionRect.bottom) {
                    intersects = true;
                }
            }

            if (footerNode) {
                const footerRect = footerNode.getBoundingClientRect();
                if (targetRect.bottom >= footerRect.top && targetRect.top <= footerRect.bottom) {
                    intersects = true;
                }
            }

            setUseWhyPalette((prev) => (prev === intersects ? prev : intersects));
        };

        updatePaletteBySection();
        window.addEventListener('scroll', updatePaletteBySection, { passive: true });
        window.addEventListener('resize', updatePaletteBySection);

        return () => {
            window.removeEventListener('scroll', updatePaletteBySection);
            window.removeEventListener('resize', updatePaletteBySection);
        };
    }, [location.pathname, open, footerOffset]);

    useEffect(() => {
        if (!isAuthenticated || !open) return;

        const loadContracts = async () => {
            setLoadingContracts(true);
            setErrorKey('');
            try {
                const userId = user?.userId || user?.username || '';
                const data = await getContracts(userId);
                setContracts(Array.isArray(data) ? data : []);
            } catch {
                setContracts([]);
                setErrorKey('loadContracts');
                trackChatEvent('chat_contracts_load_failed');
            } finally {
                setLoadingContracts(false);
            }
        };

        loadContracts();
    }, [isAuthenticated, open, user?.userId, user?.username]);

    useEffect(() => {
        if (!open && isContractMenuOpen) {
            setIsContractMenuOpen(false);
        }
    }, [open, isContractMenuOpen]);

    useEffect(() => {
        if (!open) return;
        if (!routeContractId) return;

        const exists = contracts.some((c) => c.contractId === routeContractId);
        if (exists) {
            setSelectedContractId(routeContractId);
            trackChatEvent('chat_contract_auto_selected', { contractId: routeContractId });
        }
    }, [open, routeContractId, contracts]);

    useEffect(() => {
        if (!selectedContractId || !open) {
            setMessages([]);
            setIsHistoryLoading(false);
            return;
        }

        const loadHistory = async () => {
            setIsHistoryLoading(true);
            try {
                const items = await getContractChatHistory(selectedContractId, 30);
                const mapped = [];
                for (const item of items) {
                    if (item.question) {
                        mapped.push({
                            role: 'user',
                            text: item.question,
                            ts: `${item.messageId || ''}-q`,
                            createdAt: item.createdAt || '',
                        });
                    }
                    if (item.answer) {
                        mapped.push({
                            role: 'assistant',
                            text: normalizeAssistantText(item.answer, item.question || ''),
                            ts: `${item.messageId || ''}-a`,
                            createdAt: item.createdAt || '',
                            meta: item.meta || null,
                        });
                    }
                }
                setMessages(mapped);
                setResponseHintKey('');
            } catch {
                setMessages([]);
                setErrorKey('loadHistory');
                trackChatEvent('chat_history_load_failed', { contractId: selectedContractId });
            } finally {
                setIsHistoryLoading(false);
            }
        };

        loadHistory();
    }, [selectedContractId, open]);

    const scrollMessagesToBottom = (behavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const maxScrollTop = container.scrollHeight - container.clientHeight;
        container.scrollTo({
            top: Math.max(0, maxScrollTop),
            behavior,
        });
    };

    useEffect(() => {
        if (!open) return;

        const rafId = window.requestAnimationFrame(() => {
            scrollMessagesToBottom('auto');
        });

        return () => window.cancelAnimationFrame(rafId);
    }, [open, selectedContractId, isHistoryLoading]);

    useEffect(() => {
        if (!open) return;

        const rafId = window.requestAnimationFrame(() => {
            scrollMessagesToBottom('smooth');
        });

        return () => window.cancelAnimationFrame(rafId);
    }, [open, messages.length, isAsking]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        el.style.height = 'auto';
        const maxHeight = 130;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [question, open]);

    useEffect(() => {
        if (!rateLimitRetryAt) {
            setRateLimitSecondsLeft(0);
            return;
        }

        const update = () => {
            const seconds = Math.max(0, Math.ceil((rateLimitRetryAt - Date.now()) / 1000));
            setRateLimitSecondsLeft(seconds);
            if (seconds <= 0) {
                setRateLimitRetryAt(0);
            }
        };

        update();
        const intervalId = setInterval(update, 500);
        return () => clearInterval(intervalId);
    }, [rateLimitRetryAt]);

    const sendQuestion = async () => {
        const trimmed = question.trim();
        if (!trimmed || isAsking) return;

        if (rateLimitSecondsLeft > 0) {
            setResponseHintKey('rateLimit');
            return;
        }

        if (import.meta.env.DEV && trimmed.toLowerCase() === '/test-rate-limit') {
            setQuestion('');
            setResponseHintKey('rateLimit');
            setRateLimitRetryAt(Date.now() + 60000);
            return;
        }

        if (!selectedContractId) {
            setErrorKey('selectContract');
            trackChatEvent('chat_send_blocked_no_contract');
            return;
        }

        setErrorKey('');
        setResponseHintKey('');
        setIsAsking(true);

        const userMsg = {
            role: 'user',
            text: trimmed,
            ts: Date.now(),
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setQuestion('');
        trackChatEvent('chat_question_sent', {
            contractId: selectedContractId,
            questionLength: trimmed.length,
        });

        try {
            const result = await askContractQuestion(selectedContractId, trimmed);
            const answer = normalizeAssistantText(result?.answer || t('chat.noAnswer'), trimmed);
            const botMsg = {
                role: 'assistant',
                text: answer,
                ts: Date.now(),
                createdAt: result?.createdAt || new Date().toISOString(),
                meta: result?.meta || null,
            };
            setMessages((prev) => [...prev, botMsg]);
            trackChatEvent('chat_answer_received', {
                contractId: selectedContractId,
                usedFullTextFallback: Boolean(result?.meta?.usedFullTextFallback),
            });
        } catch (error) {
            if (isRateLimitError(error)) {
                setResponseHintKey('rateLimit');
                setRateLimitRetryAt(Date.now() + 60000);
            } else {
                setErrorKey('askFailed');
            }
            trackChatEvent('chat_answer_failed', { contractId: selectedContractId });
        } finally {
            setIsAsking(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        sendQuestion();
    };

    const onInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion();
        }
    };

    const clearHistory = async () => {
        if (!selectedContractId || isAsking || messages.length === 0) return;

        setIsClearConfirmOpen(true);
    };

    const confirmClearHistory = async () => {
        if (!selectedContractId || isAsking || messages.length === 0) {
            setIsClearConfirmOpen(false);
            return;
        }

        try {
            const visibleMessagesCount = messages.length;
            const result = await clearContractChatHistory(selectedContractId);
            const apiClearedCount = Number(result?.clearedCount || 0);
            const resolvedClearedCount = Number.isFinite(apiClearedCount) && apiClearedCount > 0
                ? apiClearedCount
                : visibleMessagesCount;
            const successMessage = resolvedClearedCount > 0
                ? t('chat.clearSuccessMessage').replace('{count}', String(resolvedClearedCount))
                : t('chat.clearSuccessMessageGeneric');
            setMessages([]);
            setErrorKey('');
            setResponseHintKey('');
            setIsClearConfirmOpen(false);
            window.dispatchEvent(new CustomEvent('rg:toast', {
                detail: {
                    id: `chat-clear-${Date.now()}`,
                    title: t('chat.clearSuccessTitle'),
                    message: successMessage,
                    createdAt: Date.now(),
                    ttlMs: 3800,
                },
            }));
            trackChatEvent('chat_history_cleared', { contractId: selectedContractId });
        } catch {
            setErrorKey('clearFailed');
            setIsClearConfirmOpen(false);
            trackChatEvent('chat_history_clear_failed', { contractId: selectedContractId });
        }
    };

    const selectQuickPrompt = (promptText) => {
        setQuestion(promptText);
        setErrorKey('');
        setResponseHintKey('');
        inputRef.current?.focus();
        trackChatEvent('chat_quick_prompt_selected', {
            contractId: selectedContractId || null,
            prompt: promptText,
        });
    };

    const handleContractSelect = (nextContractId) => {
        setSelectedContractId(nextContractId);
        setResponseHintKey('');
        setIsContractMenuOpen(false);
        trackChatEvent('chat_contract_selected', { contractId: nextContractId || null });
    };

    const fallbackCopyText = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    };

    const copyMessageText = async (text, key) => {
        const content = String(text || '').trim();
        if (!content) return;

        let copied = false;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(content);
                copied = true;
            }
        } catch {
            copied = false;
        }

        if (!copied) {
            copied = fallbackCopyText(content);
        }

        if (copied) {
            setCopiedMessageKey(key);
            setTimeout(() => {
                setCopiedMessageKey((prev) => (prev === key ? '' : prev));
            }, 1300);
            trackChatEvent('chat_message_copied');
        }
    };

    const openPanel = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsClosing(false);
        setOpen(true);
    };

    const closePanel = () => {
        if (!open || isClosing) return;

        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            setIsClosing(false);
            closeTimerRef.current = null;
        }, CHAT_PANEL_CLOSE_MS);
    };

    const showPanel = open || isClosing;

    return {
        isAuthenticated,
        t,
        isRTL,
        locale,
        userInitial,
        userLabel,
        
        open,
        setOpen,
        isClosing,
        showPanel,
        openPanel,
        closePanel,
        widgetRef,
        footerOffset,
        useWhyPalette,

        contracts,
        loadingContracts,
        selectedContractId,
        selectedContractLabel,
        handleContractSelect,
        isContractMenuOpen,
        setIsContractMenuOpen,

        messages,
        isHistoryLoading,
        messagesContainerRef,

        question,
        setQuestion,
        isAsking,
        inputRef,
        onSubmit,
        onInputKeyDown,

        errorKey,
        setErrorKey,
        responseHintKey,
        setResponseHintKey,
        rateLimitSecondsLeft,

        quickPrompts,
        selectQuickPrompt,

        isClearConfirmOpen,
        setIsClearConfirmOpen,
        clearHistory,
        confirmClearHistory,

        copiedMessageKey,
        copyMessageText
    };
}