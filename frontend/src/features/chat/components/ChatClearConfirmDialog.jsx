import React from 'react';
import './ChatClearConfirmDialog.css';

const ChatClearConfirmDialog = ({ t, confirmClearHistory, setIsClearConfirmOpen }) => {
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