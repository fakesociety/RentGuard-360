import { useState, useEffect, useRef, useMemo } from 'react';
import { askContractQuestion, clearContractChatHistory, getContractChatHistory } from '@/features/chat/services/chatApi';
import { trackChatEvent } from '../utils/chatHelpers';
import { normalizeAssistantText } from '../utils/chatTextFormatting';

export function useChatMessages(selectedContractId, open, historyReloadSeq, t, errorKey, setErrorKey, responseHintKey, setResponseHintKey) {
    const [messages, setMessages] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [rateLimitRetryAt, setRateLimitRetryAt] = useState(0);
    const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);

    const quickPrompts = useMemo(() => ([
        t('chat.promptHighRisk'),
        t('chat.promptPets'),
        t('chat.promptTermination'),
    ]), [t]);

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
        if (!selectedContractId || !open) {
            setMessages([]);
            setIsHistoryLoading(false);
            return;
        }

        const loadHistory = async () => {
            setErrorKey('');
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
    }, [selectedContractId, open, historyReloadSeq, setErrorKey, setResponseHintKey]);

    useEffect(() => {
        setQuestion('');
    }, [selectedContractId]);

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

        if (errorKey) return;

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

    return {
        messages,
        isHistoryLoading,
        messagesContainerRef,
        question,
        setQuestion,
        isAsking,
        inputRef,
        onSubmit,
        onInputKeyDown,
        rateLimitSecondsLeft,
        quickPrompts,
        selectQuickPrompt,
        isClearConfirmOpen,
        setIsClearConfirmOpen,
        clearHistory,
        confirmClearHistory
    };
}