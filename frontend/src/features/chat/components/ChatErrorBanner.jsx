/** Dismissible error banner displayed at the top of the chat when an API call fails. */
import React from 'react';
import { useChatContext } from '@/features/chat/contexts/ChatContext';

export default function ChatErrorBanner() {
    const { t, errorKey } = useChatContext();

    if (!errorKey) return null;

    return <p className="chat-widget-error">{t(`chat.errors.${errorKey}`)}</p>;
}
