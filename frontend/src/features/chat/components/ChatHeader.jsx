/**
 * ============================================
 *  ChatHeader Component
 *  Header for the Contract AI Chat Widget
 * ============================================
 * 
 * STRUCTURE:
 * - Title and scope description
 * - Close button
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import { X } from 'lucide-react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';
import './ChatHeader.css';

const ChatHeader = () => {
    const { t, closePanel } = useChatContext();

    return (
        <header className="chat-widget-header">
            <div>
                <h3>{t('chat.title')}</h3>
                <p className="chat-widget-scope">{t('chat.scope')}</p>
            </div>
            <button
                className="chat-widget-close"
                onClick={closePanel}
                aria-label={t('chat.close')}
                type="button"
            >
                <X size={18} />
            </button>
        </header>
    );
};

export default ChatHeader;
