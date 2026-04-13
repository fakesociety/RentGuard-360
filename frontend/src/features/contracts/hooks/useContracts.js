/**
 * ============================================
 *  useContracts Hook
 *  Custom Hook for Managing Contracts State
 * ============================================
 * 
 * STRUCTURE:
 * - fetchContracts: Retrieves contracts from API
 * - handleDelete / confirmDelete: Contract deletion flow
 * - handleEdit / saveEdit: Contract metadata editing flow
 * - handleExport / handleShare: Exporting to Word and sharing functionality
 * - filteredContracts: Applies search and category filters
 * - sortedContracts: Applies date/score sorting
 * - paginatedContracts: Handles pagination logic
 * 
 * DEPENDENCIES:
 * - API Service (getContracts, deleteContract, getAnalysis, updateContract)
 * - ReportExportService (exportReportToWord)
 * - useShareFile
 * ============================================
 */
import { useState, useCallback, useEffect } from 'react';
import { getContracts, deleteContract } from '@/features/contracts/services/contractsApi';
import { getAnalysis, createShareLink } from '@/features/analysis/services/analysisApi';
import { exportReportToWord } from '@/features/analysis/services/ReportExportService';
import { showAppToast } from '@/components/ui/toast/toast';
import { copyToClipboard } from '@/features/contracts/utils/browserUtils';
import { useContractMetadataEditor } from '@/features/contracts/hooks/useContractMetadataEditor';

const DEFAULT_ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_TIMEOUT_MS = (() => {
    const raw = import.meta.env.VITE_ANALYSIS_TIMEOUT_MS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYSIS_TIMEOUT_MS;
})();

const isContractTimedOut = (contract) => {
    const status = (contract.status || '').toLowerCase();
    if (status === 'analyzed' || status === 'failed' || status === 'error') {
        return false;
    }
    const uploadDate = contract.uploadDate;
    if (!uploadDate) return false;

    const uploadTime = new Date(uploadDate.endsWith('Z') ? uploadDate : uploadDate + 'Z').getTime();
    const now = Date.now();
    const elapsed = now - uploadTime;

    return elapsed > ANALYSIS_TIMEOUT_MS;
};

export const useContracts = (userId, t, isRTL) => {
    // ------------------------------------------------------------------------
    // GLOBAL INVENTORY STATE: Array of all loaded documents
    // --------------------------------------------------------------------------
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        editModal,
        setEditModal,
        isSaving,
        handleEdit,
        saveEdit,
    } = useContractMetadataEditor({
        userId,
        t,
        onApplyLocalUpdate: (updatedContract) => {
            setContracts(prevContracts => prevContracts.map(contract => (
                contract.contractId === updatedContract.contractId
                    ? {
                        ...contract,
                        fileName: updatedContract.fileName,
                        propertyAddress: updatedContract.propertyAddress,
                        landlordName: updatedContract.landlordName,
                    }
                    : contract
            )));
        },
    });

    // Modern Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'high_risk', 'pending'

    // Sort state
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const contractsPerPage = 20;

    const fetchContracts = useCallback(async (showLoader = true) => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        try {
            if (showLoader) setIsLoading(true);
            else setIsRefreshing(true);

            const startTime = Date.now();
            const data = await getContracts(userId);

            const elapsed = Date.now() - startTime;
            if (!showLoader && elapsed < 1500) {
                await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
            }

            setContracts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [userId]);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);

    // Auto-refresh logic
    useEffect(() => {
        const pendingContracts = contracts.filter(c => {
            const status = (c.status || '').toLowerCase();
            if (status === 'analyzed' || status === 'failed' || status === 'error') return false;
            if (isContractTimedOut(c)) return false;
            return true;
        });

        if (pendingContracts.length === 0) return;

        const interval = setInterval(() => {
            fetchContracts(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [contracts, fetchContracts]);

    const handleDelete = (contractId, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setDeleteConfirm(contractId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm || !userId) return;
        setIsDeleting(true);
        try {
            await deleteContract(deleteConfirm, userId);
            setContracts(contracts.filter(c => c.contractId !== deleteConfirm));
            setDeleteConfirm(null);

            // Show a visual popup confirming deletion
            import('@/components/ui/toast/toast').then(({ emitAppToast }) => {
                emitAppToast({
                    type: 'success',
                    title: t('contracts.deleteSuccessTitle'),
                    message: t('contracts.deleteSuccess')
                });
            }).catch(() => {
                alert(t('contracts.deleteSuccess'));
            });

        } catch {
            alert(t('contracts.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExport = async (contract) => {
        try {
            const analysis = await getAnalysis(contract.contractId);
            showAppToast({ type: 'info', message: t('export.started') });
            await exportReportToWord(analysis, contract.fileName || t('export.defaultFilename'));
            showAppToast({ type: 'success', message: t('export.success') });
        } catch {
            showAppToast({ type: 'error', message: t('export.error') });
        }
    };

    const handleShare = async (contract) => {
        try {
            showAppToast({ type: 'info', message: t('contracts.generatingShareLink') || 'Generating link...' });

            const result = await createShareLink(contract.contractId);
            const shareUrl = `${window.location.origin}/#/shared/${result.shareToken}`;

            let sharedNatively = false;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: contract.fileName || t('contracts.menuShareTitle'),
                        text: t('contracts.menuShareTrigger'),
                        url: shareUrl,
                    });
                    sharedNatively = true;
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') return;
                    console.warn('Native share blocked due to timeout, falling back to clipboard...');
                }
            }

            if (!sharedNatively) {
                const success = await copyToClipboard(shareUrl);
                if (!success) {
                    window.prompt(t('contracts.linkCopiedFallback') || 'Copy link:', shareUrl);
                }
                showAppToast({ type: 'success', message: t('contracts.linkCopiedFallback') });
            }
        } catch (err) {
            console.error('Share error:', err);
            showAppToast({ type: 'error', message: t('contracts.shareFailedSpecific') });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
        return new Date(utcDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US');
    };

    // Apply Search and Filters
    const filteredContracts = contracts.filter(c => {
        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const nameMatch = (c.fileName || '').toLowerCase().includes(query);
            const addressMatch = (c.propertyAddress || '').toLowerCase().includes(query);
            const landlordMatch = (c.landlordName || '').toLowerCase().includes(query);
            if (!nameMatch && !addressMatch && !landlordMatch) return false;
        }

        // Category Filter
        if (activeFilter === 'high_risk') {
            const score = c.riskScore ?? c.risk_score ?? 100;
            if (score > 50 || c.status !== 'analyzed') return false;
        } else if (activeFilter === 'pending') {
            if (c.status === 'analyzed' || c.status === 'failed' || c.status === 'error') return false;
        }

        return true;
    });

    // Sort contracts
    const sortedContracts = [...filteredContracts].sort((a, b) => {
        if (sortBy === 'date') {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else if (sortBy === 'score') {
            const scoreA = a.riskScore ?? a.risk_score ?? 100;
            const scoreB = b.riskScore ?? b.risk_score ?? 100;
            // Ascending score means higher risk first (lower score = riskier contract).
            return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        }
        return 0;
    });

    const totalPages = Math.ceil(sortedContracts.length / contractsPerPage);
    const startIndex = (currentPage - 1) * contractsPerPage;
    const paginatedContracts = sortedContracts.slice(startIndex, startIndex + contractsPerPage);

    const handleSortClick = (nextSortBy) => {
        if (sortBy === nextSortBy) {
            setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
            return;
        }
        setSortBy(nextSortBy);
        setSortOrder(nextSortBy === 'date' ? 'desc' : 'asc');
    };

    return {
        contracts,
        isLoading,
        isRefreshing,
        deleteConfirm,
        setDeleteConfirm,
        isDeleting,
        editModal,
        setEditModal,
        isSaving,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        sortBy,
        sortOrder,
        currentPage,
        setCurrentPage,
        totalPages,
        paginatedContracts,
        filteredContracts,
        handleDelete,
        confirmDelete,
        handleEdit,
        saveEdit,
        handleExport,
        handleShare,
        formatDate,
        handleSortClick
    };
};


