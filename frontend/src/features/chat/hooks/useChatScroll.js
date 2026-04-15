import { useEffect, useRef, useCallback } from 'react';

export const useChatScroll = (deps) => {
    const {
        open,
        selectedContractId,
        isHistoryLoading,
        messagesLength,
        isAsking
    } = deps;

    const messagesContainerRef = useRef(null);

    const scrollMessagesToBottom = useCallback((behavior = 'smooth') => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior
            });
        }
    }, []);

    // Scroll to bottom immediately when opening or changing contracts
    useEffect(() => {
        if (!open) return;
        const rafId = window.requestAnimationFrame(() => {
            scrollMessagesToBottom('auto');
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [open, selectedContractId, isHistoryLoading, scrollMessagesToBottom]);

    // Scroll to bottom smoothly when new messages arrive or when AI is typing
    useEffect(() => {
        if (!open) return;
        const rafId = window.requestAnimationFrame(() => {
            scrollMessagesToBottom('smooth');
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [open, messagesLength, isAsking, scrollMessagesToBottom]);

    return { messagesContainerRef, scrollMessagesToBottom };
};
