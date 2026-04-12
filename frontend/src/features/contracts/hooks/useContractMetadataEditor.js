/**
 * ============================================
 *  useContractMetadataEditor Hook
 *  Handles updating arbitrary key-value markers on a file
 * ============================================
 *
 * STRUCTURE:
 * - Local Draft State: Staging edits before saving
 * - saveEdits: Commits changes safely to AWS backend
 * - rename / delete flags
 *
 * DEPENDENCIES:
 * - contractsApi
 * - cacheService (Refresh cache after edits)
 * ============================================
 */
import { useCallback, useState } from 'react';
import { updateContract } from '@/features/contracts/services/contractsApi';
import { showAppToast } from '@/utils/toast';
import { normalizeDraftFileName, normalizeFinalFileName } from '@/features/contracts/utils/fileUtils';

/**
 * Shared metadata editing flow for contract surfaces (Contracts page + Analysis page).
 */
export const useContractMetadataEditor = ({ userId, t, onApplyLocalUpdate, onAfterSave } = {}) => {
    const [editModal, setEditModal] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleEdit = useCallback((contract, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();

        if (!contract?.contractId) return;

        setEditModal({
            contractId: contract.contractId,
            fileName: normalizeDraftFileName(contract.fileName),
            propertyAddress: String(contract.propertyAddress || ''),
            landlordName: String(contract.landlordName || ''),
        });
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editModal) return false;
        if (!userId) {
            showAppToast({
                type: 'error',
                title: t('contracts.editSaveFailedTitle'),
                message: t('contracts.saveFailed'),
            });
            return false;
        }

        setIsSaving(true);
        try {
            const updates = {
                fileName: normalizeFinalFileName(editModal.fileName, t).trim() || t('contracts.defaultFileName'),
                propertyAddress: String(editModal.propertyAddress || '').trim(),
                landlordName: String(editModal.landlordName || '').trim(),      
            };

            await updateContract(editModal.contractId, userId, updates);        

            const updatedContract = {
                contractId: editModal.contractId,
                fileName: updates.fileName,
                landlordName: updates.landlordName,
            };

            onApplyLocalUpdate?.(updatedContract);
            setEditModal(null);

            showAppToast({
                type: 'success',
                title: t('contracts.editSaveSuccessTitle'),
                message: t('contracts.editSaveSuccessMessage'),
            });

            if (onAfterSave) {
                await onAfterSave(updatedContract);
            }

            return true;
        } catch (error) {
            console.error('Failed to save contract metadata', error);
            showAppToast({
                type: 'error',
                title: t('contracts.editSaveFailedTitle'),
                message: t('contracts.saveFailed'),
            });
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [editModal, onAfterSave, onApplyLocalUpdate, t, userId]);

    return {
        editModal,
        setEditModal,
        isSaving,
        handleEdit,
        saveEdit,
    };
};

export default useContractMetadataEditor;
