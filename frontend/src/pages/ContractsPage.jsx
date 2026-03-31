/**
 * ============================================
 * ContractsPage
 * User's Contract List & Management (LexisFlow Modern UI)
 * ============================================
 */
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getContracts, deleteContract, getAnalysis, updateContract } from '../services/api';
import { exportToWord, exportToPDF, exportToPDFBlob } from '../services/ExportService';
import useShareFile from '../hooks/useShareFile';
import ActionMenu from '../components/ActionMenu';
import {
    Trash2, Pencil, Download, Plus, RefreshCw, FileText, X, Check,
    MoreVertical, MapPin, Users, Calendar, AlertTriangle,
    Share2, Search, Filter, CheckCircle2
} from 'lucide-react';
import './ContractsPage.css';

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

// ============================================
// Modern Contract Card Component
// ============================================
const ContractCard = ({ contract, onDelete, onEdit, onExport, onShare, formatDate, t, isRTL }) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const status = (contract.status || '').toLowerCase();

    const getScoreData = (score) => {
        if (score >= 86) return { class: 'excellent', label: t('contracts.lowRisk') };
        if (score >= 71) return { class: 'good', label: t('contracts.lowMediumRisk') };
        if (score >= 51) return { class: 'warning', label: t('contracts.mediumRisk') };
        return { class: 'danger', label: t('contracts.highRisk') };
    };

    const isTimedOut = isContractTimedOut(contract);
    const isAnalyzed = status === 'analyzed';
    const isFailed = status === 'failed' || status === 'error' || isTimedOut;
    const score = contract.riskScore ?? contract.risk_score ?? null;
    const hasScore = isAnalyzed && score !== null && score !== undefined;

    const scoreData = hasScore ? getScoreData(score) : { color: '#64748b', class: 'pending', label: '---' };

    // Determine Card Border & Badge Color based on status
    let cardClass = 'lf-card-pending';
    let badgeClass = 'lf-badge-pending';
    let badgeLabel = t('contracts.pendingAnalysis');

    if (isAnalyzed) {
        cardClass = `lf-card-${scoreData.class}`;
        badgeClass = `lf-badge-${scoreData.class}`;
        badgeLabel = scoreData.label;
    } else if (isFailed) {
        cardClass = 'lf-card-danger';
        badgeClass = 'lf-badge-danger';
        badgeLabel = isTimedOut ? t('contracts.statusTimedOutRetry') : t('contracts.statusAnalysisFailed');
    }

    return (
        <div className={`lf-contract-card ${cardClass}`}>

            <div className="lf-card-header">
                <div className="lf-card-title-group">
                    <span className={`lf-card-badge ${badgeClass}`}>
                        {!isAnalyzed && !isFailed && <RefreshCw size={12} className="lf-spin-icon" />}
                        {badgeLabel}
                    </span>
                    <h3 className="lf-card-title" onClick={(e) => onEdit(contract, e)}>
                        {contract.fileName || t('contracts.untitledContract')}
                    </h3>
                    <p className="lf-card-date">
                        <Calendar size={12} />
                        {t('contracts.uploadDate')} {formatDate(contract.uploadDate)}
                    </p>
                </div>

                {/* 3-Dots Menu for Edit/Delete/Share */}
                <div className="lf-card-menu-wrap">
                    <ActionMenu
                        isOpen={activeMenu === 'options'}
                        onToggle={() => setActiveMenu(activeMenu === 'options' ? null : 'options')}
                        onClose={() => setActiveMenu(null)}
                        triggerClassName="lf-menu-trigger"
                        triggerContent={<MoreVertical size={20} />}
                        panelClassName={`lf-dropdown-menu ${isRTL ? 'rtl' : 'ltr'}`}
                    >
                        <button className="lf-menu-item" onClick={(e) => { onEdit(contract, e); setActiveMenu(null); }}>
                            <Pencil size={16} /> <span>{t('contracts.editButtonTitle')}</span>
                        </button>
                        <button className="lf-menu-item" onClick={() => { onShare(contract); setActiveMenu(null); }} disabled={!isAnalyzed}>
                            <Share2 size={16} /> <span>{t('contracts.menuShareTrigger')}</span>
                        </button>
                        <div className="lf-menu-divider"></div>
                        <button className="lf-menu-item lf-danger-text" onClick={(e) => { onDelete(contract.contractId, e); setActiveMenu(null); }}>
                            <Trash2 size={16} /> <span>{t('contracts.deleteButtonTitle')}</span>
                        </button>
                    </ActionMenu>
                </div>
            </div>

            {/* Gauge or Processing State */}
            <div className="lf-card-gauge-area">
                {hasScore ? (
                    <div className="lf-gauge-container" style={{ '--percentage': score, '--gauge-color': scoreData.color }}>
                        <div className="lf-gauge-track"></div>

                        <div className="lf-gauge-reveal">
                            <div className="lf-gauge-gradient"></div>
                        </div>

                        <div className="lf-gauge-content">
                            <span className="lf-gauge-score">{score}</span>
                            <span className="lf-gauge-label">{t('contracts.riskScore', 'מדד סיכון')}</span>
                        </div>
                    </div>
                ) : isFailed ? (
                    <div className="lf-gauge-failed">
                        <AlertTriangle size={40} className="lf-danger-text" />
                        <span className="lf-gauge-label mt-2">{t('contracts.analysisFailed', 'הניתוח נכשל')}</span>
                    </div>
                ) : (
                    <div className="lf-gauge-processing">
                        <div className="lf-pulse-bar-wrap">
                            <div className="lf-pulse-bar"></div>
                        </div>
                        <span className="lf-gauge-label mt-3">{t('contracts.processingData', 'מעבד סעיפי התקשרות...')}</span>
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="lf-card-meta">
                <div className="lf-meta-item">
                    <div className="lf-meta-icon"><MapPin size={18} /></div>
                    <div className="lf-meta-text">
                        <span className="lf-meta-lbl">{t('contracts.propertyAddress')}</span>
                        <span className="lf-meta-val">{contract.propertyAddress || t('contracts.notSpecified')}</span>
                    </div>
                </div>
                <div className="lf-meta-item">
                    <div className="lf-meta-icon"><Users size={18} /></div>
                    <div className="lf-meta-text">
                        <span className="lf-meta-lbl">{t('contracts.landlordName')}</span>
                        <span className="lf-meta-val">{contract.landlordName || t('contracts.notSpecified')}</span>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="lf-card-footer">
                {isAnalyzed ? (
                    <Link to={`/analysis/${encodeURIComponent(contract.contractId)}`} state={{ contract }} className="lf-btn-view">
                        {t('contracts.viewAnalysis')}
                    </Link>
                ) : (
                    <button className="lf-btn-view disabled" disabled>
                        {isFailed ? t('contracts.statusFailedShort') : t('contracts.statusPendingShort')}
                    </button>
                )}

                <div className="lf-card-footer-actions">
                    <button
                        type="button"
                        className="lf-btn-edit"
                        onClick={(e) => onEdit(contract, e)}
                        title={t('contracts.editButtonTitle')}
                        aria-label={t('contracts.editButtonTitle')}
                    >
                        <Pencil size={18} />
                    </button>

                    <ActionMenu
                        isOpen={activeMenu === 'export'}
                        onToggle={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                        onClose={() => setActiveMenu(null)}
                        triggerClassName="lf-btn-download"
                        triggerContent={<Download size={20} />}
                        panelClassName={`lf-dropdown-menu export-menu ${isRTL ? 'rtl' : 'ltr'}`}
                    >
                        <div className="lf-menu-title">{t('contracts.menuDownloadTitle')}</div>
                        <button className="lf-menu-item" onClick={() => { onExport(contract, 'word'); setActiveMenu(null); }} disabled={!isAnalyzed}>
                            <FileText size={16} /> <span>{t('contracts.menuExportWordTitle')}</span>
                        </button>
                        <button className="lf-menu-item" onClick={() => { onExport(contract, 'pdf'); setActiveMenu(null); }} disabled={!isAnalyzed}>
                            <Download size={16} /> <span>{t('contracts.menuExportPdfTitle')}</span>
                        </button>
                    </ActionMenu>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Main Contracts Page
// ============================================
const ContractsPage = () => {
    const { user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
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
        const userId = user?.userId || user?.username || userAttributes?.sub;
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
    }, [user, userAttributes]);

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
        if (!deleteConfirm) return;
        const userId = user?.userId || user?.username || userAttributes?.sub;
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
        if (!editModal) return;
        const userId = user?.userId || user?.username || userAttributes?.sub;
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

    if (isLoading) {
        return (
            <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="lf-loading-state">
                    <RefreshCw size={40} className="lf-spin-icon text-primary" />
                    <p>{t('contracts.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lf-page-wrapper lf-mesh-bg" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Action Notices */}
            {isRefreshing && (
                <div className="lf-floating-notice">
                    <RefreshCw size={16} className="lf-spin-icon" />
                    <span>{t('contracts.refreshing')}</span>
                </div>
            )}
            {actionNotice && (
                <div className="lf-floating-notice success">
                    <CheckCircle2 size={16} />
                    <span>{actionNotice}</span>
                </div>
            )}

            {/* Modals - Same logic, wrapped in standard portal */}
            {deleteConfirm && ReactDOM.createPortal(
                <div className="lf-modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="lf-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="lf-modal-header lf-danger-text">
                            <h3><AlertTriangle size={20} /> {t('contracts.deleteTitle')}</h3>
                        </div>
                        <div className="lf-modal-body center-text">
                            <p>{t('contracts.deleteConfirm')}</p>
                        </div>
                        <div className="lf-modal-footer center-footer">
                            <button className="lf-btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                                {isDeleting ? t('contracts.deleting') : t('contracts.delete')}
                            </button>
                            <button className="lf-btn-cancel" onClick={() => setDeleteConfirm(null)}>{t('contracts.cancel')}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {editModal && ReactDOM.createPortal(
                <div className="lf-modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="lf-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="lf-modal-header">
                            <h3><Pencil size={20} /> {t('contracts.editTitle')}</h3>
                            <button className="lf-modal-close" onClick={() => setEditModal(null)}><X size={20} /></button>
                        </div>
                        <div className="lf-modal-body">
                            <div className="lf-form-group">
                                <label>{t('contracts.fileName')}</label>
                                <input type="text" className="lf-input" value={editModal.fileName} onChange={e => setEditModal({ ...editModal, fileName: e.target.value })} />
                            </div>
                            <div className="lf-form-group">
                                <label>{t('contracts.propertyAddress')}</label>
                                <input type="text" className="lf-input" value={editModal.propertyAddress} onChange={e => setEditModal({ ...editModal, propertyAddress: e.target.value })} />
                            </div>
                            <div className="lf-form-group">
                                <label>{t('contracts.landlordName')}</label>
                                <input type="text" className="lf-input" value={editModal.landlordName} onChange={e => setEditModal({ ...editModal, landlordName: e.target.value })} />
                            </div>
                        </div>
                        <div className="lf-modal-footer">
                            <button className="lf-btn-primary" onClick={saveEdit} disabled={isSaving}>
                                <Check size={16} /> {isSaving ? t('contracts.saving') : t('contracts.save')}
                            </button>
                            <button className="lf-btn-cancel" onClick={() => setEditModal(null)}>{t('contracts.cancel')}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* HERO SECTION */}
            <section className="lf-hero-section">
                <div className="lf-hero-content">
                    <div className="lf-hero-text">
                        <h1 className="lf-hero-title">{t('contracts.title')}</h1>
                        <div className="lf-hero-badges">
                            <span className="lf-hero-count">{contracts.length} {t('contracts.activeContracts')}</span>
                            <p className="lf-hero-subtitle hidden-mobile">{t('contracts.subtitle')}</p>
                        </div>
                    </div>
                    <div className="lf-hero-actions">
                        <Link to="/upload" className="lf-btn-upload-hero">
                            <Plus size={24} className="icon-filled" />
                            {t('contracts.uploadContract')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* WAVE DIVIDER */}
            <div className="lf-wave-divider">
                <svg preserveAspectRatio="none" viewBox="0 0 1440 120">
                    <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
                </svg>
            </div>

            {/* MAIN CONTENT AREA */}
            <section className="lf-content-section">

                {/* Search & Filters */}
                {contracts.length > 0 && (
                    <div className="lf-filter-bar">
                        <div className="lf-search-box">
                            <Search className="lf-search-icon" size={20} />
                            <input
                                type="text"
                                className="lf-search-input"
                                placeholder={t('contracts.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="lf-filter-chips">
                            <button className={`lf-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
                                {t('contracts.filterAll')}
                            </button>
                            <button className={`lf-chip ${activeFilter === 'high_risk' ? 'active' : ''}`} onClick={() => setActiveFilter('high_risk')}>
                                {t('contracts.filterHighRisk')}
                            </button>
                            <button className={`lf-chip ${activeFilter === 'pending' ? 'active' : ''}`} onClick={() => setActiveFilter('pending')}>
                                {t('contracts.filterPending')}
                            </button>

                            <button
                                className={`lf-chip border-dashed ${sortBy === 'date' ? 'active' : ''}`}
                                onClick={() => handleSortClick('date')}
                            >
                                <Filter size={14} />
                                <span>{t('contracts.sortDate')}</span>
                                <span className="lf-sort-order">
                                    {sortBy === 'date'
                                        ? (sortOrder === 'desc' ? t('contracts.sortNewest') : t('contracts.sortOldest'))
                                        : t('contracts.sortNewest')}
                                </span>
                            </button>

                            <button
                                className={`lf-chip border-dashed ${sortBy === 'score' ? 'active' : ''}`}
                                onClick={() => handleSortClick('score')}
                            >
                                <AlertTriangle size={14} />
                                <span>{t('contracts.sortScore')}</span>
                                <span className="lf-sort-order">
                                    {sortBy === 'score'
                                        ? (sortOrder === 'asc' ? t('contracts.sortHighRiskFirst') : t('contracts.sortLowRiskFirst'))
                                        : t('contracts.sortHighRiskFirst')}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Grid */}
                {contracts.length === 0 ? (
                    <div className="lf-empty-state">
                        <div className="lf-empty-icon-wrap"><FileText size={48} /></div>
                        <h2>{t('contracts.noContracts')}</h2>
                        <p>{t('contracts.noContractsDesc')}</p>
                        <Link to="/upload" className="lf-btn-upload-empty">
                            <Plus size={20} /> {t('contracts.uploadFirst')}
                        </Link>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <div className="lf-empty-state">
                        <Search size={40} className="lf-text-muted mb-4" />
                        <h2>{t('contracts.noResults')}</h2>
                        <p>{t('contracts.noResultsDesc')}</p>
                        <button className="lf-btn-cancel mt-4" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}>{t('contracts.clearFilters')}</button>
                    </div>
                ) : (
                    <div className="lf-contracts-grid">
                        {paginatedContracts.map(contract => (
                            <ContractCard
                                key={contract.contractId}
                                contract={contract}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onExport={handleExport}
                                onShare={handleShare}
                                formatDate={formatDate}
                                t={t}
                                isRTL={isRTL}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="lf-pagination-area">
                        <div className="lf-pagination-wrap">
                            <button className="lf-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                {isRTL ? '→' : '←'}
                            </button>
                            <span className="lf-page-info">
                                {t('contracts.pageOf').replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}
                            </span>
                            <button className="lf-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                {isRTL ? '←' : '→'}
                            </button>
                        </div>
                    </div>
                )}

            </section>
        </div>
    );
};

export default ContractsPage;