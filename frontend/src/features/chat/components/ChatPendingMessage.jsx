import React from 'react';
import { Bot } from 'lucide-react';
import './ChatPendingMessage.css';

const ChatPendingMessage = ({ t }) => {
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
