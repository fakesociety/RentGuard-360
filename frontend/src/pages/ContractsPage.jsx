import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getContracts, deleteContract, getAnalysis, updateContract } from '../services/api';
import { exportToWord, exportToPDF } from '../services/ExportService';
import Button from '../components/Button';
import RiskGauge from '../components/RiskGauge';
import { Trash2, Pencil, Download, Plus, RefreshCw, FileText, X, Check, ChevronDown, ArrowUpDown, Calendar, AlertTriangle } from 'lucide-react';
import './ContractsPage.css';

// Contract Card Component
const ContractCard = ({ contract, onDelete, onEdit, onExport, formatDate, t, isRTL }) => {
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Score thresholds match legend: lower score = higher risk
    const getScoreColor = (score) => {
        if (score >= 86) return 'excellent';  // 86-100: Low Risk (green)
        if (score >= 71) return 'good';       // 71-85: Low-Medium Risk (light green)
        if (score >= 51) return 'medium';     // 51-70: Medium Risk (orange)
        return 'low';                         // 0-50: High Risk (red)
    };

    const getScoreLabel = (score) => {
        if (score >= 86) return t('contracts.lowRisk');
        if (score >= 71) return t('contracts.lowMediumRisk');
        if (score >= 51) return t('contracts.mediumRisk');
        return t('contracts.highRisk');
    };


    const isAnalyzed = contract.status === 'analyzed';
    const isFailed = contract.status === 'failed' || contract.status === 'error';
    const score = contract.riskScore ?? contract.risk_score ?? null;
    const hasScore = isAnalyzed && score !== null && score !== undefined;

    return (
        <div className="contract-card">
            {/* Card Header */}
            <div className="card-header">
                <div className="card-icon">
                    <FileText size={20} />
                </div>
                <div className="card-header-content">
                    <h3 className="card-title">{contract.fileName || (isRTL ? 'חוזה ללא שם' : 'Untitled Contract')}</h3>
                    <span className="card-date">{formatDate(contract.uploadDate)}</span>
                </div>
                {/* Score Gauge */}
                {hasScore ? (
                    <RiskGauge score={score} size={80} />
                ) : isFailed ? (
                    <div className="score-gauge error">
                        <X size={24} strokeWidth={3} />
                    </div>
                ) : (
                    <div className="score-gauge pending">
                        <RefreshCw size={20} className="spinning" />
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="card-body">
                {/* Status */}
                <div className="status-row">
                    {isAnalyzed ? (
                        <span className={`status-chip ${getScoreColor(score)}`}>
                            {getScoreLabel(score)}
                        </span>
                    ) : isFailed ? (
                        <span className="status-chip error">{isRTL ? 'שגיאה בניתוח' : 'Analysis Failed'}</span>
                    ) : (
                        <span className="status-chip pending">{t('contracts.pendingAnalysis')}...</span>
                    )}
                    {contract.analyzedDate && (
                        <span className="analyzed-date">{isRTL ? 'נותח:' : 'Analyzed:'} {formatDate(contract.analyzedDate)}</span>
                    )}
                </div>

                {/* Meta Info */}
                <div className="card-meta">
                    <p className="meta-item">
                        <span className="meta-label">{t('contracts.propertyAddress')}:</span> {contract.propertyAddress || t('contracts.notSpecified')}
                    </p>
                    <p className="meta-item">
                        <span className="meta-label">{t('contracts.landlordName')}:</span> {contract.landlordName || t('contracts.notSpecified')}
                    </p>
                </div>
            </div>

            {/* Card Footer - Actions */}
            <div className="card-footer">
                <Link to={`/analysis/${encodeURIComponent(contract.contractId)}`} className="view-btn">
                    {t('contracts.viewAnalysis')}
                </Link>
                <div className="action-buttons">
                    {/* Export Dropdown */}
                    <div className="dropdown-container">
                        <button
                            className="icon-btn"
                            onClick={(e) => { e.preventDefault(); setShowExportMenu(!showExportMenu); }}
                            title="ייצוא"
                        >
                            <Download size={16} />
                        </button>
                        {showExportMenu && (
                            <div className="dropdown-menu">
                                <button onClick={() => { onExport(contract, 'pdf'); setShowExportMenu(false); }}>
                                    PDF
                                </button>
                                <button onClick={() => { onExport(contract, 'word'); setShowExportMenu(false); }}>
                                    Word
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="icon-btn" onClick={(e) => onEdit(contract, e)} title="עריכה">
                        <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={(e) => onDelete(contract.contractId, e)} title="מחיקה">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main Contracts Page
const ContractsPage = () => {
    const { user, userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const location = useLocation();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Filter/Sort state
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'score'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

    useEffect(() => { fetchContracts(); }, [user]);

    // Auto-refresh while there are pending contracts
    useEffect(() => {
        const hasPending = contracts.some(c =>
            c.status === 'processing' ||
            c.status === 'uploaded' ||
            c.status === 'pending' ||
            !c.status  // No status yet
        );
        if (!hasPending) return;
        // Poll every 5 seconds for faster updates
        const interval = setInterval(() => fetchContracts(false), 5000);
        return () => clearInterval(interval);
    }, [contracts, user]);

    const fetchContracts = async (showLoader = true) => {
        const userId = user?.userId || user?.username || userAttributes?.sub;
        if (!userId) { setIsLoading(false); return; }

        try {
            if (showLoader) setIsLoading(true);
            else setIsRefreshing(true);
            const data = await getContracts(userId);
            setContracts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

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
        } catch (err) {
            alert('מחיקה נכשלה');
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
                fileName: editModal.fileName.trim() || 'Contract',
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
        } catch (err) {
            alert('שמירה נכשלה');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async (contract, type) => {
        try {
            const analysis = await getAnalysis(contract.contractId);
            if (type === 'pdf') await exportToPDF(analysis, contract.fileName || 'Report');
            else await exportToWord(analysis, contract.fileName || 'Report');
        } catch (err) {
            alert('ייצוא נכשל');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
        return new Date(utcDate).toLocaleDateString('he-IL');
    };

    // Sort contracts based on current filter
    const sortedContracts = [...contracts].sort((a, b) => {
        if (sortBy === 'date') {
            const dateA = new Date(a.uploadDate || 0);
            const dateB = new Date(b.uploadDate || 0);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        } else if (sortBy === 'score') {
            const scoreA = a.riskScore ?? a.risk_score ?? 0;
            const scoreB = b.riskScore ?? b.risk_score ?? 0;
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
        return 0;
    });

    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle order if same field
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(newSortBy);
            setSortOrder('desc');
        }
    };

    if (isLoading) {
        return (
            <div className="contracts-page" dir="rtl">
                <div className="loading-container">
                    <RefreshCw size={32} className="spinning" />
                    <p>{t('contracts.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contracts-page" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>{t('contracts.deleteTitle')}</h3>
                        <p>{t('contracts.deleteConfirm')}</p>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('contracts.cancel')}</button>
                            <button className="btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                                {isDeleting ? t('contracts.deleting') : t('contracts.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div className="modal-backdrop" onClick={() => setEditModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>{t('contracts.editTitle')}</h3>
                        <div className="form-group">
                            <label>{t('contracts.fileName')}</label>
                            <input
                                type="text"
                                value={editModal.fileName}
                                onChange={e => setEditModal({ ...editModal, fileName: e.target.value })}
                                placeholder="שם הקובץ"
                            />
                        </div>
                        <div className="form-group">
                            <label>כתובת הנכס</label>
                            <input
                                type="text"
                                value={editModal.propertyAddress}
                                onChange={e => setEditModal({ ...editModal, propertyAddress: e.target.value })}
                                placeholder="כתובת"
                            />
                        </div>
                        <div className="form-group">
                            <label>שם המשכיר</label>
                            <input
                                type="text"
                                value={editModal.landlordName}
                                onChange={e => setEditModal({ ...editModal, landlordName: e.target.value })}
                                placeholder="משכיר"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="btn-secondary" onClick={() => setEditModal(null)}>ביטול</button>
                            <button className="btn-primary" onClick={saveEdit} disabled={isSaving}>
                                {isSaving ? 'שומר...' : 'שמירה'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <header className="page-header">
                <div className="header-content">
                    <h1>{t('contracts.title')}</h1>
                    <p>{t('contracts.subtitle')}</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-ghost"
                        onClick={() => fetchContracts(false)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
                        {t('contracts.refresh')}
                    </button>
                    <Link to="/upload" className="btn-primary">
                        <Plus size={18} />
                        {t('contracts.uploadContract')}
                    </Link>
                </div>
            </header>

            {/* Filter Bar */}
            {contracts.length > 0 && (
                <div className="filter-bar">
                    <span className="filter-label">{t('contracts.sortBy')}</span>
                    <button
                        className={`filter-btn ${sortBy === 'date' ? 'active' : ''}`}
                        onClick={() => handleSortChange('date')}
                    >
                        <Calendar size={16} />
                        <span>{t('contracts.sortDate')}</span>
                        {sortBy === 'date' && (
                            <span className="sort-arrow">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                    </button>
                    <button
                        className={`filter-btn ${sortBy === 'score' ? 'active' : ''}`}
                        onClick={() => handleSortChange('score')}
                    >
                        <AlertTriangle size={16} />
                        <span>{t('contracts.sortScore')}</span>
                        {sortBy === 'score' && (
                            <span className="sort-arrow">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                        )}
                    </button>
                </div>
            )}

            {/* Content */}
            {contracts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FileText size={48} />
                    </div>
                    <h2>{t('contracts.noContracts')}</h2>
                    <p>{t('contracts.noContractsDesc')}</p>
                    <Link to="/upload" className="btn-primary large">
                        <Plus size={20} />
                        {t('contracts.uploadFirst')}
                    </Link>
                </div>
            ) : (
                <div className="contracts-grid">
                    {sortedContracts.map(contract => (
                        <ContractCard
                            key={contract.contractId}
                            contract={contract}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onExport={handleExport}
                            formatDate={formatDate}
                            t={t}
                            isRTL={isRTL}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContractsPage;
