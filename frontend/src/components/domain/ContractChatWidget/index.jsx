import React from 'react';
import { MessageCircle, X, Bot, ChevronDown } from 'lucide-react';
import ActionMenu from '../../ui/ActionMenu';
import ChatMessage from './ChatMessage';
import ChatHeader from './ChatHeader';
import ChatInputForm from './ChatInputForm';
import { useContractChat } from '../../../hooks/useContractChat';
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
    } = useContractChat();

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

                    <div className="chat-widget-messages" role="log" aria-live="polite" ref={messagesContainerRef}>
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

                    <ChatInputForm 
                        t={t}
                        question={question}
                        setQuestion={setQuestion}
                        onSubmit={onSubmit}
                        onInputKeyDown={onInputKeyDown}
                        inputRef={inputRef}
                        isAsking={isAsking}
                        rateLimitSecondsLeft={rateLimitSecondsLeft}
                    />

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
