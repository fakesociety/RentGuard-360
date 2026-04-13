import React from 'react';
import ActionMenu from '@/components/ui/ActionMenu';
import { ChevronDown } from 'lucide-react';
import './ChatContractSelector.css';

const ChatContractSelector = ({
    t,
    contracts,
    loadingContracts,
    selectedContractId,
    selectedContractLabel,
    handleContractSelect,
    isContractMenuOpen,
    setIsContractMenuOpen,
    clearHistory,
    isAsking,
    isHistoryLoading,
    messagesCount
}) => {
    return (
        <div className="chat-widget-contract-picker">
            <label id="chat-contract-select-label">{t('chat.contractLabel')}</label>
            <div className="chat-widget-contract-row">
                <ActionMenu
                    isOpen={isContractMenuOpen}
                    onToggle={() => setIsContractMenuOpen((prev) => !prev)}
                    onClose={() => setIsContractMenuOpen(false)}
                    containerClassName="chat-contract-menu"
                    triggerClassName="chat-contract-trigger"
                    triggerAriaLabel={t('chat.contractLabel')}
                    disabled={loadingContracts}
                    triggerContent={
                        <>
                            <span
                                id="chat-contract-select"
                                className={`chat-contract-trigger-label ${selectedContractId ? 'selected' : 'placeholder'}`}
                            >
                                {selectedContractLabel}
                            </span>
                            <ChevronDown
                                size={15}
                                className={`chat-contract-trigger-chevron ${isContractMenuOpen ? 'open' : ''}`}
                            />
                        </>
                    }
                    panelClassName="chat-contract-dropdown"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleContractSelect('')}
                        className={`chat-contract-option ${selectedContractId ? '' : 'active'}`}
                    >
                        {loadingContracts ? t('chat.loadingContracts') : t('chat.selectContract')}
                    </button>

                    {contracts.map((contract) => {
                        const isActive = selectedContractId === contract.contractId;
                        const label = contract.fileName || contract.contractId;
                        return (
                            <button
                                key={contract.contractId}
                                type="button"
                                role="menuitem"
                                onClick={() => handleContractSelect(contract.contractId)}
                                title={label}
                                className={`chat-contract-option ${isActive ? 'active' : ''}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </ActionMenu>
                
                <button
                    type="button"
                    className="chat-widget-clear"
                    onClick={clearHistory}
                    disabled={!selectedContractId || isAsking || isHistoryLoading || messagesCount === 0}
                    title={t('chat.clear')}
                >
                    {t('chat.clearShort')}
                </button>
            </div>
        </div>
    );
};

export default ChatContractSelector;
