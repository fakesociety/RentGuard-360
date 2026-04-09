/**
 * ============================================
 *  ContractsPage
 *  User's Contract List & Management (LexisFlow Modern UI)
 * ============================================
 * 
 * STRUCTURE:
 * - Search & Filter inputs
 * - Renders ContractCards in a grid
 * - Modals for Delete / Edit
 * 
 * DEPENDENCIES:
 * - useContracts (Hook for data/logic)
 * - ContractCard
 * ============================================
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useContracts } from '@/features/contracts/hooks/useContracts';
import ContractCard from '@/features/contracts/components/ContractCard';
import {
    Plus, RefreshCw, FileText, X, Check,
    AlertTriangle,
    Search, Filter, CheckCircle2, Pencil,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import './ContractsPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';


// ============================================
// Main Contracts Page
// ============================================
const ContractsPage = () => {
    const { user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const userId = userAttributes?.sub || user?.userId || user?.sub || user?.username;

    const {
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
    } = useContracts(userId, t, isRTL);

    if (isLoading) {
        return (
            <div className="contracts-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="contracts-loading-state">
                    <GlobalSpinner size={40} />
                </div>
            </div>
        );
    }

    return (
        <div className="contracts-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Action Notices */}
            {isRefreshing && (
                <div className="lf-floating-notice">
                    <GlobalSpinner size={40} />
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
                    <path className="lf-wave-path" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
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
                                {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                            </button>
                            <span className="lf-page-info">
                                {t('contracts.pageOf').replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}
                            </span>
                            <button className="lf-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                )}

            </section>
        </div>
    );
};

export default ContractsPage;
