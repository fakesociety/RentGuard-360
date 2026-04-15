/** Informational hint banner shown in the chat to guide first-time users on how to use the feature. */
import React from 'react';
import { X } from 'lucide-react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';

export default function ChatHintBanner() {
    const { t, responseHintKey, rateLimitSecondsLeft, setResponseHintKey } = useChatContext();

    if (!responseHintKey) return null;

    return (
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
    );
}
