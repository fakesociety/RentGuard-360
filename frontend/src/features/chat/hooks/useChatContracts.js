import { useState, useEffect, useMemo } from 'react';
import { getContracts } from '@/features/contracts/services/contractsApi';
import { trackChatEvent } from '../utils/chatHelpers';

export function useChatContracts(isAuthenticated, open, user, t, routeContractId, setErrorKey) {
    const [loadingContracts, setLoadingContracts] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [selectedContractId, setSelectedContractId] = useState('');
    const [isContractMenuOpen, setIsContractMenuOpen] = useState(false);
    const [historyReloadSeq, setHistoryReloadSeq] = useState(0);

    const selectedContractLabel = useMemo(() => {
        if (loadingContracts) return t('chat.loadingContracts');
        if (!selectedContractId) return t('chat.selectContract');

        const selected = contracts.find((contract) => contract.contractId === selectedContractId);
        return selected?.fileName || selected?.contractId || t('chat.selectContract');
    }, [contracts, loadingContracts, selectedContractId, t]);

    useEffect(() => {
        if (!isAuthenticated || !open) return;

        const loadContracts = async () => {
            setLoadingContracts(true);
            setErrorKey('');
            try {
                const userId = user?.userId || user?.username || '';
                const data = await getContracts(userId);
                setContracts(Array.isArray(data) ? data : []);
            } catch {
                setContracts([]);
                setErrorKey('loadContracts');
                trackChatEvent('chat_contracts_load_failed');
            } finally {
                setLoadingContracts(false);
            }
        };

        loadContracts();
    }, [isAuthenticated, open, user?.userId, user?.username, setErrorKey]);

    useEffect(() => {
        if (!open && isContractMenuOpen) {
            setIsContractMenuOpen(false);
        }
    }, [open, isContractMenuOpen]);

    useEffect(() => {
        if (!open || !routeContractId) return;

        const exists = contracts.some((c) => c.contractId === routeContractId);
        if (exists) {
            setSelectedContractId(routeContractId);
            trackChatEvent('chat_contract_auto_selected', { contractId: routeContractId });
        }
    }, [open, routeContractId, contracts]);

    const handleContractSelect = (nextContractId) => {
        setSelectedContractId(nextContractId);
        setHistoryReloadSeq((prev) => prev + 1);
        setErrorKey('');
        setIsContractMenuOpen(false);
        trackChatEvent('chat_contract_selected', { contractId: nextContractId || null });
    };

    return {
        contracts,
        loadingContracts,
        selectedContractId,
        selectedContractLabel,
        handleContractSelect,
        isContractMenuOpen,
        setIsContractMenuOpen,
        historyReloadSeq
    };
}