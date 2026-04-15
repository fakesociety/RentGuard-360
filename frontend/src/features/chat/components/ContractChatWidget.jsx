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
import { MessageCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatHeader from './ChatHeader';
import ChatInputForm from './ChatInputForm';
import ChatContractSelector from './ChatContractSelector';
import ChatPendingMessage from './ChatPendingMessage';
import ChatQuickPrompts from './ChatQuickPrompts';
import ChatClearConfirmDialog from './ChatClearConfirmDialog';
import ChatHintBanner from './ChatHintBanner';
import ChatErrorBanner from './ChatErrorBanner';
import { ChatProvider, useChatContext } from '@/features/chat/contexts/ChatContext';
import { useChatScroll } from '@/features/chat/hooks/useChatScroll';
import './ContractChatWidget.css';

const ChatWidgetContent = () => {
    const {
        isAuthenticated,
        t,
        isRTL,
        
        open,
        isClosing,
        showPanel,
        openPanel,
        widgetRef,
        footerOffset,
        useWhyPalette,

        selectedContractId,

        messages,
        isHistoryLoading,

        isAsking,
        isClearConfirmOpen,
    } = useChatContext();

    // Side effect for automatically scrolling chat messages to the bottom
    const { messagesContainerRef } = useChatScroll({
        open,
        selectedContractId,
        isHistoryLoading,
        messagesLength: messages.length,
        isAsking
    });

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
                    <ChatHeader />

                    <ChatContractSelector />

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
                            <ChatQuickPrompts />
                        )}

                        {messages.map((msg) => (
                            <ChatMessage
                                key={`${msg.ts}-${msg.role}`}
                                msg={msg}
                            />
                        ))}

                        {isAsking && <ChatPendingMessage />}
                    </div>

                    <ChatHintBanner />

                    <ChatErrorBanner />

                    <ChatInputForm />

                    {isClearConfirmOpen && (
                        <ChatClearConfirmDialog />
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

const ContractChatWidget = () => {
    return (
        <ChatProvider>
            <ChatWidgetContent />
        </ChatProvider>
    );
};

export default ContractChatWidget;
