/**
 * ============================================
 * useChatWidget Hook
 * Composer Hook for AI Contract Assistant Chat
 * ============================================
 * * STRUCTURE:
 * This is the master composer hook. It delegates logic to:
 * - useChatUI: visual states, opening/closing, clipboard
 * - useChatContracts: fetching and managing the contract list
 * - useChatMessages: fetching history and managing the conversation
 * ============================================
 */
import { useMemo, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { isContractChatAutoOpenEnabled, getAnalysisContractIdFromPath, looksLikeMachineId } from '../utils/chatHelpers';
import { useChatUI } from './useChatUI';
import { useChatContracts } from './useChatContracts';
import { useChatMessages } from './useChatMessages';

export function useChatWidget() {
    const { isAuthenticated, user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const location = useLocation();

    // Shared state between sub-hooks
    const [errorKey, setErrorKey] = useState('');
    const [responseHintKey, setResponseHintKey] = useState('');

    const routeContractId = useMemo(() => getAnalysisContractIdFromPath(location.pathname), [location.pathname]);
    const lastAutoOpenedPathRef = useRef('');

    // 1. UI Logic
    const ui = useChatUI(location.pathname);

    // Auto open logic
    useEffect(() => {
        if (!isAuthenticated || !routeContractId || !isContractChatAutoOpenEnabled()) return;
        const currentPath = location.pathname;
        if (lastAutoOpenedPathRef.current === currentPath) return;

        ui.setOpen(true);
        lastAutoOpenedPathRef.current = currentPath;
    }, [isAuthenticated, routeContractId, location.pathname, ui.setOpen]);

    // 2. Contracts Logic
    const contractsState = useChatContracts(
        isAuthenticated, 
        ui.open, 
        user, 
        t, 
        routeContractId, 
        setErrorKey
    );

    // 3. Messages Logic
    const messagesState = useChatMessages(
        contractsState.selectedContractId,
        ui.open,
        contractsState.historyReloadSeq,
        t,
        errorKey,
        setErrorKey,
        responseHintKey,
        setResponseHintKey
    );

    // Prepare User Info
    const userLabel = useMemo(() => {
        if (userAttributes?.name) return userAttributes.name;
        if (typeof userAttributes?.email === 'string' && userAttributes.email.includes('@')) {
            return userAttributes.email.split('@')[0];
        }
        if (user?.name) return user.name;
        if (user?.fullName) return user.fullName;
        if (user?.given_name) return user.given_name;
        if (typeof user?.email === 'string' && user.email.includes('@')) {
            return user.email.split('@')[0];
        }
        if (user?.username && !looksLikeMachineId(user.username)) {
            return user.username;
        }
        return t('common.user');
    }, [userAttributes, user, t]);

    const userInitial = String(userLabel).trim().charAt(0).toUpperCase() || 'U';
    const locale = isRTL ? 'he-IL' : 'en-US';

    return {
        isAuthenticated,
        t,
        isRTL,
        locale,
        userInitial,
        userLabel,
        errorKey,
        setErrorKey,
        responseHintKey,
        setResponseHintKey,
        ...ui,
        ...contractsState,
        ...messagesState
    };
}