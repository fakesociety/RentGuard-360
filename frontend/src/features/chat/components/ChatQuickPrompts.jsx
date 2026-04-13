import React from 'react';
import './ChatQuickPrompts.css';

const ChatQuickPrompts = ({ t, quickPrompts, selectQuickPrompt }) => {
    return (
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
    );
};

export default ChatQuickPrompts;