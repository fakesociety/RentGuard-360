/** Animated typing indicator shown while waiting for the AI response in the chat. */
import React from 'react';
import { Bot } from 'lucide-react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';
import './ChatPendingMessage.css';

const ChatPendingMessage = () => {
    const { t } = useChatContext();

    return (
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
    );
};

export default ChatPendingMessage;
