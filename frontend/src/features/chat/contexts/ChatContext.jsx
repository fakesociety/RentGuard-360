import React, { createContext, useContext, useMemo } from 'react';
import { useChatWidget } from '@/features/chat/hooks/useChatWidget';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
    const chatState = useChatWidget();
    
    // Memoize the context value to prevent unnecessary re-renders of consuming components.
    // We spread chatState values to shallow compare its properties as dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const value = useMemo(() => chatState, Object.values(chatState));
    
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};
