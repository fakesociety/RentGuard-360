import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Copy, Check, Bot, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { askContractQuestion, clearContractChatHistory, getContractChatHistory, getContracts } from '../services/api';
import ActionMenu from './ActionMenu';
import './ContractChatWidget.css';

const getAnalysisContractIdFromPath = (pathname) => {
    const match = String(pathname || '').match(/^\/analysis\/([^/?#]+)/);
    if (!match || !match[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

const normalizeAssistantText = (rawText, originalQuestion = '') => {
    const text = String(rawText || '');
    if (!text) return '';

    const normalizedQuestion = String(originalQuestion || '').trim();
    const escapedQuestion = normalizedQuestion
        ? normalizedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : '';

    let cleaned = text
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

const formatMessageTime = (rawTime, locale) => {
    if (!rawTime) return '';
    const date = new Date(rawTime);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const looksLikeMachineId = (value) => {
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

const ContractChatWidget = () => {
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
    const [isTipCollapsed, setIsTipCollapsed] = useState(true);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isContractMenuOpen, setIsContractMenuOpen] = useState(false);
    const [footerOffset, setFooterOffset] = useState(24);
    const [useWhyPalette, setUseWhyPalette] = useState(false);
    const lastAutoOpenedPathRef = useRef('');
    const widgetRef = useRef(null);
    const inputRef = useRef(null);
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

        // Only use username if it looks human-readable, not like a Cognito opaque ID.
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

            // Find the specific UI elements
            const headerNode = document.querySelector('.chat-widget-header');
            const launcherNode = document.querySelector('.chat-widget-launcher');

            // THE FIX: Check the Header if chat is open, or the Launcher if closed!
            const targetNode = open ? headerNode : launcherNode;

            if (!targetNode) return;

            const targetRect = targetNode.getBoundingClientRect();
            let intersects = false;

            // Check if the specific target touches the Green Saul Goodman section
            if (whySectionNode) {
                const sectionRect = whySectionNode.getBoundingClientRect();
                if (targetRect.bottom >= sectionRect.top && targetRect.top <= sectionRect.bottom) {
                    intersects = true;
                }
            }

            // Keep the dashboard contrast palette while the widget touches the footer zone.
            if (footerNode) {
                const footerRect = footerNode.getBoundingClientRect();
                if (targetRect.bottom >= footerRect.top && targetRect.top <= footerRect.bottom) {
                    intersects = true;
                }
            }

            setUseWhyPalette((prev) => (prev === intersects ? prev : intersects));
        };

        // Run immediately and attach listeners
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

    if (!isAuthenticated) return null;

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

    return (
        <div
            className={`chat-widget ${open ? 'open' : ''} ${useWhyPalette ? 'context-why' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ '--chat-offset-bottom': `${footerOffset}px` }}
            ref={widgetRef}
        >
            {open && (
                <section className="chat-widget-panel" aria-label={t('chat.title')}>
                    <header className="chat-widget-header">
                        <div>
                            <h3>{t('chat.title')}</h3>
                            <p className="chat-widget-scope">{t('chat.scope')}</p>
                        </div>
                        <button
                            className="chat-widget-close"
                            onClick={() => setOpen(false)}
                            aria-label={t('chat.close')}
                            type="button"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div className="chat-widget-contract-picker">
                        <label id="chat-contract-select-label">{t('chat.contractLabel')}</label>
                        <div className="chat-widget-contract-row">
                            <ActionMenu
                                isOpen={isContractMenuOpen}
                                onToggle={() => setIsContractMenuOpen((prev) => !prev)}
                                onClose={() => setIsContractMenuOpen(false)}
                                containerClassName="chat-contract-menu"
                                triggerClassName="chat-contract-trigger"
                                triggerAriaLabel={t('chat.contractLabel')}
                                disabled={loadingContracts}
                                triggerContent={
                                    <>
                                        <span
                                            id="chat-contract-select"
                                            className={`chat-contract-trigger-label ${selectedContractId ? 'selected' : 'placeholder'}`}
                                        >
                                            {selectedContractLabel}
                                        </span>
                                        <ChevronDown
                                            size={15}
                                            className={`chat-contract-trigger-chevron ${isContractMenuOpen ? 'open' : ''}`}
                                        />
                                    </>
                                }
                                panelClassName="chat-contract-dropdown"
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleContractSelect('')}
                                    className={`chat-contract-option ${selectedContractId ? '' : 'active'}`}
                                >
                                    {loadingContracts ? t('chat.loadingContracts') : t('chat.selectContract')}
                                </button>

                                {contracts.map((contract) => {
                                    const isActive = selectedContractId === contract.contractId;
                                    const label = contract.fileName || contract.contractId;
                                    return (
                                        <button
                                            key={contract.contractId}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => handleContractSelect(contract.contractId)}
                                            title={label}
                                            className={`chat-contract-option ${isActive ? 'active' : ''}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </ActionMenu>
                            <button
                                type="button"
                                className="chat-widget-clear"
                                onClick={clearHistory}
                                disabled={!selectedContractId || isAsking || isHistoryLoading || messages.length === 0}
                                title={t('chat.clear')}
                            >
                                {t('chat.clearShort')}
                            </button>
                        </div>
                    </div>

                    <div className="chat-widget-messages" role="log" aria-live="polite">
                        {selectedContractId && isHistoryLoading && (
                            <div className="chat-widget-empty">
                                {`${t('common.loading')}...`}
                            </div>
                        )}

                        {!selectedContractId && (
                            <div className="chat-widget-empty">{t('chat.emptySelectContract')}</div>
                        )}

                        {selectedContractId && !isHistoryLoading && messages.length === 0 && (
                            <div className="chat-widget-empty">{t('chat.emptyStart')}</div>
                        )}

                        {selectedContractId && !isHistoryLoading && messages.length === 0 && (
                            <div className="chat-widget-quick-prompts" aria-label={t('chat.quickPromptsLabel')}>
                                {quickPrompts.map((promptText) => (
                                    <button
                                        key={promptText}
                                        type="button"
                                        className="chat-widget-prompt-chip"
                                        onClick={() => selectQuickPrompt(promptText)}
                                    >
                                        {promptText}
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.map((msg) => {
                            const messageKey = `${msg.ts}-${msg.role}`;
                            const copied = copiedMessageKey === messageKey;

                            return (
                            <div key={messageKey} className={`chat-msg-row ${msg.role}`}>
                                <div className={`chat-msg-avatar ${msg.role}`} aria-hidden="true">
                                    {msg.role === 'assistant' ? <Bot size={14} /> : <span>{userInitial}</span>}
                                </div>
                                <article className={`chat-msg ${msg.role}`}>
                                    <div className="chat-msg-head">
                                        <div className="chat-msg-meta">
                                            <div className="chat-msg-role">{msg.role === 'user' ? userLabel : t('chat.assistant')}</div>
                                            {msg.createdAt && <div className="chat-msg-time">{formatMessageTime(msg.createdAt, locale)}</div>}
                                        </div>
                                        <button
                                            type="button"
                                            className="chat-msg-copy"
                                            onClick={() => copyMessageText(msg.text, messageKey)}
                                            title={copied ? t('chat.copied') : t('chat.copy')}
                                            aria-label={copied ? t('chat.copied') : t('chat.copy')}
                                        >
                                            {copied ? <Check size={13} /> : <Copy size={13} />}
                                            <span>{copied ? t('chat.copied') : t('chat.copy')}</span>
                                        </button>
                                    </div>
                                    <p>{msg.text}</p>
                                </article>
                            </div>
                            );
                        })}

                        {isAsking && (
                            <div className="chat-msg-row assistant pending">
                                <div className="chat-msg-avatar assistant" aria-hidden="true">
                                    <Bot size={14} />
                                </div>
                                <article className="chat-msg assistant pending">
                                    <div className="chat-msg-role">{t('chat.assistant')}</div>
                                    <p className="chat-typing">
                                        <span>{t('chat.thinking')}</span>
                                        <span className="chat-typing-dots" aria-hidden="true">
                                            <i />
                                            <i />
                                            <i />
                                        </span>
                                    </p>
                                </article>
                            </div>
                        )}
                    </div>

                    {responseHintKey && (
                        <div className="chat-widget-hint" role="status" aria-live="polite">
                            <div className="chat-widget-hint-head">
                                <p>
                                    {t(`chat.hints.${responseHintKey}`)}
                                    {responseHintKey === 'rateLimit' && rateLimitSecondsLeft > 0
                                        ? ` ${t('chat.rateLimitRetryIn').replace('{seconds}', String(rateLimitSecondsLeft))}`
                                        : ''}
                                </p>
                                <button
                                    type="button"
                                    className="chat-widget-hint-close"
                                    onClick={() => setResponseHintKey('')}
                                    aria-label={t('chat.dismissHint')}
                                    title={t('chat.dismissHint')}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {errorKey && <p className="chat-widget-error">{t(`chat.errors.${errorKey}`)}</p>}

                    <form onSubmit={onSubmit} className="chat-widget-input-row">
                        <textarea
                            ref={inputRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={onInputKeyDown}
                            placeholder={t('chat.inputPlaceholder')}
                            maxLength={1200}
                            disabled={isAsking || rateLimitSecondsLeft > 0}
                            rows={1}
                            dir="auto"
                        />
                        <button type="submit" disabled={isAsking || rateLimitSecondsLeft > 0 || !question.trim()} aria-label={t('chat.send')}>
                            <Send size={16} />
                        </button>
                    </form>
                    <div className={`chat-widget-tip ${isTipCollapsed ? 'collapsed' : ''}`}>
                        <button
                            type="button"
                            className="chat-widget-tip-toggle"
                            onClick={() => setIsTipCollapsed((prev) => !prev)}
                            aria-expanded={!isTipCollapsed}
                        >
                            {isTipCollapsed ? t('chat.showNotice') : t('chat.hideNotice')}
                        </button>
                        {!isTipCollapsed && (
                            <p>
                                {`${t('chat.tip')} ${t('chat.disclaimer')}`}
                            </p>
                        )}
                    </div>

                    {isClearConfirmOpen && (
                        <div className="chat-widget-confirm-overlay" role="dialog" aria-modal="true" aria-label={t('chat.clear')}>
                            <div className="chat-widget-confirm-card">
                                <h4>{t('chat.clear')}</h4>
                                <p>{t('chat.clearConfirm')}</p>
                                <div className="chat-widget-confirm-actions">
                                    <button
                                        type="button"
                                        className="chat-widget-confirm-cancel"
                                        onClick={() => setIsClearConfirmOpen(false)}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        className="chat-widget-confirm-danger"
                                        onClick={confirmClearHistory}
                                    >
                                        {t('chat.clearShort')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {!open && (
                <button
                    type="button"
                    className="chat-widget-launcher"
                    onClick={() => setOpen(true)}
                    aria-label={t('chat.open')}
                >
                    <MessageCircle size={20} />
                    <span>{t('chat.title')}</span>
                </button>
            )}
        </div>
    );
};

export default ContractChatWidget;
