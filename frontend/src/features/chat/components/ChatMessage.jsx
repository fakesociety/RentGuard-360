/**
 * ============================================
 *  ChatMessage Component
 *  Single message bubble in the Contract AI Chat
 * ============================================
 * 
 * STRUCTURE:
 * - Avatar (Bot/User)
 * - Message content (Text, Source, Evidence)
 * - Copy message button
 * 
 * DEPENDENCIES:
 * - chatTextFormatting utils
 * ============================================
 */
import React from 'react';
import { Check, Copy, Bot } from 'lucide-react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';
import './ChatMessage.css';
import { formatMessageTime } from '@/features/chat/utils/chatTextFormatting';

const ChatMessage = ({ msg }) => {
    const { t, userInitial, userLabel, copyMessageText, copiedMessageKey, locale } = useChatContext();

    const messageKey = `${msg.ts}-${msg.role}`;
    const copied = copiedMessageKey === messageKey;
    
    const evidenceItems = msg.parsedMeta?.evidenceItems || [];
    const sourceType = msg.parsedMeta?.sourceType || '';

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
                {msg.role === 'assistant' && sourceType && (
                    <div className={`chat-msg-source ${sourceType}`}>
                        {sourceType === 'contract' ? t('chat.sourceContract') : t('chat.sourceGeneral')}
                    </div>
                )}
                {msg.role === 'assistant' && evidenceItems.length > 0 && (
                    <div className="chat-msg-evidence">
                        <div className="chat-msg-evidence-title">{t('chat.evidenceTitle')}</div>
                        <ul className="chat-msg-evidence-list">
                            {evidenceItems.map((item, index) => (
                                <li key={`${messageKey}-evidence-${item.source || index}`}>
                                    {item.clauseRef && (
                                        <span className="chat-msg-evidence-anchor">{item.clauseRef}</span>
                                    )}
                                    <span>{item.snippet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </article>
        </div>
    );
};

export default ChatMessage;




