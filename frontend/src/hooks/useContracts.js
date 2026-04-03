import { useState, useCallback, useEffect } from 'react';
import { getContracts, deleteContract, getAnalysis, updateContract } from '../services/api';
import { exportToWord, exportToPDF, exportToPDFBlob } from '../services/ExportService';
import useShareFile from './useShareFile';

const DEFAULT_ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_TIMEOUT_MS = (() => {
    const raw = import.meta.env.VITE_ANALYSIS_TIMEOUT_MS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYSIS_TIMEOUT_MS;
})();

export const isContractTimedOut = (contract) => {
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
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [actionNotice, setActionNotice] = useState(null);
    const { shareFile } = useShareFile();

    // Modern Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'high_risk', 'pending'

    // Sort state
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const contractsPerPage = 20;

    const showActionNotice = useCallback((message) => {
        setActionNotice(message);
        setTimeout(() => setActionNotice(null), 3000);
    }, []);

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
        } catch {
            alert(t('contracts.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (contract, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setEditModal({
            contractId: contract.contractId,
            fileName: (contract.fileName || '').replace(/\.pdf$/i, ''),
            propertyAddress: contract.propertyAddress || '',
            landlordName: contract.landlordName || ''
        });
    };

    const saveEdit = async () => {
        if (!editModal || !userId) return;
        setIsSaving(true);
        try {
            const updates = {
                fileName: editModal.fileName.trim() || t('contracts.defaultFileName'),
                propertyAddress: editModal.propertyAddress.trim(),
                landlordName: editModal.landlordName.trim()
            };
            await updateContract(editModal.contractId, userId, updates);
            const finalFileName = updates.fileName.endsWith('.pdf') ? updates.fileName : `${updates.fileName}.pdf`;
            setContracts(contracts.map(c =>
                c.contractId === editModal.contractId
                    ? { ...c, fileName: finalFileName, propertyAddress: updates.propertyAddress, landlordName: updates.landlordName }
                    : c
            ));
            setEditModal(null);
        } catch {
            alert(t('contracts.saveFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async (contract, type) => {
        try {
            const analysis = await getAnalysis(contract.contractId);
            if (type === 'pdf') {
                await exportToPDF(analysis, contract.fileName || 'Report');
                showActionNotice(t('contracts.exportPdfStarted'));
            } else {
                await exportToWord(analysis, contract.fileName || 'Report');
                showActionNotice(t('contracts.exportWordStarted'));
            }
        } catch {
            alert(t('contracts.exportFailed'));
        }
    };

    const handleShare = async (contract) => {
        try {
            const analysis = await getAnalysis(contract.contractId);
            const baseFileName = `${(contract.fileName || 'Report').replace(/\.(pdf|docx)$/i, '')}`;
            const blob = await exportToPDFBlob(analysis, baseFileName);
            await shareFile(blob, `${baseFileName}.pdf`, 'application/pdf');
            showActionNotice(t('contracts.shareSheetOpened'));
        } catch (err) {
            console.error('Share failed:', err);
            alert(t('contracts.shareFailed'));
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
        actionNotice,
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
