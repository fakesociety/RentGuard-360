/**
 * ============================================
 *  ContractChatWidget
 *  Floating AI Chat Assistant for Contracts
 * ============================================
 * 
 * STRUCTURE:
 * - Floating launcher button
 * - Main chat panel (Header, Messages, Input)
 * - Contract selector
 * - Quick prompts
 * 
 * DEPENDENCIES:
 * - useContractChat hook
 * - ChatMessage, ChatHeader, ChatInputForm, ChatContractSelector, ChatClearConfirmDialog, ChatPendingMessage, ChatQuickPrompts
 * ============================================
 */
import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatHeader from './ChatHeader';
import ChatInputForm from './ChatInputForm';
import ChatContractSelector from './ChatContractSelector';
import ChatPendingMessage from './ChatPendingMessage';
import ChatQuickPrompts from './ChatQuickPrompts';
import ChatClearConfirmDialog from './ChatClearConfirmDialog';
import { useChatWidget } from '@/features/chat/hooks/useChatWidget';
import './ContractChatWidget.css';

const ContractChatWidget = () => {
    const {
        isAuthenticated,
        t,
        isRTL,
        locale,
        userInitial,
        userLabel,
        
        open,
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
    } = useChatWidget();
    if (!isAuthenticated) return null;

    return (
        <div
            className={`chat-widget ${open ? 'open' : ''} ${showPanel ? 'panel-visible' : ''} ${isClosing ? 'closing' : ''} ${useWhyPalette ? 'context-why' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ '--chat-offset-bottom': `${footerOffset}px` }}
            ref={widgetRef}
        >
            {showPanel && (
                <section className={`chat-widget-panel ${isClosing ? 'closing' : ''}`} aria-label={t('chat.title')}>
                    <ChatHeader t={t} closePanel={closePanel} />

                    <ChatContractSelector 
                        t={t}
                        contracts={contracts}
                        loadingContracts={loadingContracts}
                        selectedContractId={selectedContractId}
                        selectedContractLabel={selectedContractLabel}
                        handleContractSelect={handleContractSelect}
                        isContractMenuOpen={isContractMenuOpen}
                        setIsContractMenuOpen={setIsContractMenuOpen}
                        clearHistory={clearHistory}
                        isAsking={isAsking}
                        isHistoryLoading={isHistoryLoading}
                        messagesCount={messages.length}
                    />

                    <div className="chat-widget-messages" role="log" aria-live="polite" ref={messagesContainerRef}>
                        {selectedContractId && isHistoryLoading && (
                            <div className="chat-widget-empty">
                            </div>
                        )}

                        {!selectedContractId && (
                            <div className="chat-widget-empty">{t('chat.emptySelectContract')}</div>
                        )}

                        {selectedContractId && !isHistoryLoading && messages.length === 0 && (
                            <div className="chat-widget-empty">{t('chat.emptyStart')}</div>
                        )}

                        {selectedContractId && !isHistoryLoading && messages.length === 0 && (
                            <ChatQuickPrompts 
                                t={t} 
                                quickPrompts={quickPrompts} 
                                selectQuickPrompt={selectQuickPrompt} 
                            />
                        )}

{messages.map((msg) => (
                              <ChatMessage
                                  key={`${msg.ts}-${msg.role}`}
                                  msg={msg}
                                  isRTL={isRTL}
                                  t={t}
                                  userInitial={userInitial}
                                  userLabel={userLabel}
                                  copyMessageText={copyMessageText}
                                  copiedMessageKey={copiedMessageKey}
                                  locale={locale}
                              />
                          ))}

                        {isAsking && <ChatPendingMessage t={t} />}
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

                    <ChatInputForm 
                        t={t}
                        question={question}
                        setQuestion={setQuestion}
                        onSubmit={onSubmit}
                        onInputKeyDown={onInputKeyDown}
                        inputRef={inputRef}
                        isAsking={isAsking}
                        hasBlockingError={Boolean(errorKey)}
                        rateLimitSecondsLeft={rateLimitSecondsLeft}
                    />

                    {isClearConfirmOpen && (
                        <ChatClearConfirmDialog 
                            t={t}
                            confirmClearHistory={confirmClearHistory}
                            setIsClearConfirmOpen={setIsClearConfirmOpen}
                        />
                    )}
                </section>
            )}

            {!showPanel && (
                <button
                    type="button"
                    className="chat-widget-launcher"
                    onClick={openPanel}
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
