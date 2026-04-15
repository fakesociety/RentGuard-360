/** Confirmation dialog shown before clearing all chat messages for a contract. */
import React from 'react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';
import './ChatClearConfirmDialog.css';

const ChatClearConfirmDialog = () => {
    const { t, confirmClearHistory, setIsClearConfirmOpen } = useChatContext();

    return (
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
    );
};

export default ChatClearConfirmDialog;
