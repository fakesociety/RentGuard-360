import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContracts, deleteContract, getAnalysis, updateContract } from '../services/api';
import { exportToWord, exportToPDF } from '../services/ExportService';
import Card from '../components/Card';
import Button from '../components/Button';
import './ContractsPage.css';

const ContractsPage = () => {
    const { user, userAttributes } = useAuth();
    const location = useLocation();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [exportDropdown, setExportDropdown] = useState(null);

    // Inline edit state - { contractId, fileName, propertyAddress, landlordName }
    const [editingCard, setEditingCard] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Check if user just came from upload page
    const justUploaded = location.state?.justUploaded || false;
    const [showUploadBanner, setShowUploadBanner] = useState(justUploaded);

    useEffect(() => {
        fetchContracts();
        // Auto-hide upload banner after 2 minutes
        if (showUploadBanner) {
            const timer = setTimeout(() => setShowUploadBanner(false), 120000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setExportDropdown(null);
        if (exportDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [exportDropdown]);

    const fetchContracts = async (showRefreshing = false) => {
        const userId = user?.userId || user?.username || userAttributes?.sub;

        if (!userId) {
            setIsLoading(false);
            setContracts([]);
            return;
        }

        try {
            if (showRefreshing) setIsRefreshing(true);
            else setIsLoading(true);

            console.log('Fetching contracts for user:', userId);
            const data = await getContracts(userId);
            setContracts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
            setContracts([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Auto-refresh contracts with pending analysis every 10 seconds
    useEffect(() => {
        const hasPending = contracts.some(c => c.status === 'processing' || c.status === 'uploaded');
        if (!hasPending) return;

        const refreshInterval = setInterval(() => {
            console.log('Auto-refreshing for pending analysis...');
            fetchContracts(false);
        }, 10000);

        return () => clearInterval(refreshInterval);
    }, [contracts, user]);

    const handleDelete = async (contractId, e) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();
        setDeleteConfirm(contractId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        const userId = user?.userId || user?.username || userAttributes?.sub;
        setIsDeleting(true);

        try {
            console.log('Deleting contract:', deleteConfirm, 'for user:', userId);
            const result = await deleteContract(deleteConfirm, userId);
            console.log('Delete result:', result);
            setContracts(contracts.filter(c => c.contractId !== deleteConfirm));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete contract. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Start inline editing mode for a card
    const startEdit = (contract, e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingCard({
            contractId: contract.contractId,
            fileName: (contract.fileName || 'Contract').replace(/\.pdf$/i, ''),
            propertyAddress: contract.propertyAddress || '',
            landlordName: contract.landlordName || ''
        });
    };

    // Cancel editing without saving
    const cancelEdit = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setEditingCard(null);
    };

    // Save edits to the backend
    const saveEdit = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!editingCard) return;

        const userId = user?.userId || user?.username || userAttributes?.sub;
        setIsSaving(true);

        try {
            const updates = {
                fileName: editingCard.fileName.trim() || 'Contract',
                propertyAddress: editingCard.propertyAddress.trim(),
                landlordName: editingCard.landlordName.trim()
            };

            await updateContract(editingCard.contractId, userId, updates);

            // Update local state
            const finalFileName = updates.fileName.endsWith('.pdf')
                ? updates.fileName
                : `${updates.fileName}.pdf`;

            setContracts(contracts.map(c =>
                c.contractId === editingCard.contractId
                    ? { ...c, fileName: finalFileName, propertyAddress: updates.propertyAddress, landlordName: updates.landlordName }
                    : c
            ));
            setEditingCard(null);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Format UTC date string to user's local timezone
    const formatDate = (dateString) => {
        if (!dateString) return '';
        // Append 'Z' if not present to indicate UTC
        const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
        return new Date(utcDate).toLocaleDateString();
    };

    const getStatusBadge = (status, riskScore) => {
        if (status === 'analyzed') {
            const color = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
            return <span className={`status-badge ${color}`}>✅ Analyzed</span>;
        }
        if (status === 'processing') {
            return (
                <span className="status-badge processing">
                    <span className="spinner"></span> Analyzing...
                </span>
            );
        }
        return (
            <span className="status-badge processing">
                <span className="spinner"></span> Processing...
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="contracts-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading your contracts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contracts-page">
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>🗑️ Delete Contract?</h3>
                        <p>This will permanently delete this contract and its analysis. This action cannot be undone.</p>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete} loading={isDeleting}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refresh Recommendation Banner */}
            {showUploadBanner && (
                <div className="upload-banner animate-slideUp">
                    <span className="spinner"></span>
                    <div>
                        <strong>Your contract is being analyzed...</strong>
                        <p>This usually takes 30-60 seconds. The page will auto-refresh.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => fetchContracts(true)}>
                        Refresh Now
                    </Button>
                    <button className="banner-close" onClick={() => setShowUploadBanner(false)}>×</button>
                </div>
            )}

            <div className="contracts-header animate-fadeIn">
                <div className="header-left">
                    <h1>My Contracts</h1>
                    <p>Manage your uploaded rental contracts</p>
                </div>
                <Link to="/upload">
                    <Button variant="primary">+ Upload New</Button>
                </Link>
            </div>

            {/* Always Visible Help Banner */}
            <div className="help-banner">
                <div className="help-icon">💡</div>
                <div className="help-content">
                    <strong>Just uploaded a contract?</strong>
                    <p>Analysis takes 30-60 seconds. Click "Refresh Contracts" below to see updates. If analysis doesn't complete after 2 minutes, <Link to="/contact">contact support</Link>.</p>
                </div>
            </div>

            {contracts.length === 0 ? (
                <Card variant="glass" padding="xl" className="empty-state animate-slideUp">
                    <div className="empty-icon">📁</div>
                    <h2>No Contracts Yet</h2>
                    <p>Upload your first rental contract to get started</p>
                    <Link to="/upload">
                        <Button variant="primary" size="lg">Upload Your First Contract</Button>
                    </Link>
                </Card>
            ) : (
                <div className="contracts-grid">
                    {contracts.map((contract, index) => (
                        <div key={contract.contractId} className="contract-wrapper">
                            <Link
                                to={`/analysis/${encodeURIComponent(contract.contractId)}`}
                                className="contract-link"
                            >
                                <Card
                                    variant="elevated"
                                    padding="md"
                                    hoverable
                                    className="contract-card animate-slideUp"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Action Bar */}
                                    <div className="card-action-bar">
                                        {/* Export Button with Dropdown */}
                                        <div className="dropdown-wrapper">
                                            <button
                                                className={`card-action-btn export ${exportDropdown === contract.contractId ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setExportDropdown(exportDropdown === contract.contractId ? null : contract.contractId);
                                                }}
                                                title="Export options"
                                            >
                                                📊 Export Report ▼
                                            </button>
                                            {exportDropdown === contract.contractId && (
                                                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            try {
                                                                const analysis = await getAnalysis(contract.contractId);
                                                                await exportToPDF(analysis, contract.fileName || 'Contract_Report');
                                                                setExportDropdown(null);
                                                            } catch (err) {
                                                                console.error('PDF export failed:', err);
                                                                alert('Export failed. Please view the contract first.');
                                                            }
                                                        }}
                                                    >
                                                        📄 Issues Report (PDF)
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            try {
                                                                const analysis = await getAnalysis(contract.contractId);
                                                                await exportToWord(analysis, contract.fileName || 'Contract_Report');
                                                                setExportDropdown(null);
                                                            } catch (err) {
                                                                console.error('Word export failed:', err);
                                                                alert('Export failed. Please view the contract first.');
                                                            }
                                                        }}
                                                    >
                                                        📝 Issues Report (Word)
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Edit Button */}
                                        <button
                                            className="card-action-btn edit"
                                            onClick={(e) => startEdit(contract, e)}
                                            title="Edit contract details"
                                        >
                                            ✏️ Edit
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            className="card-action-btn delete"
                                            onClick={(e) => handleDelete(contract.contractId, e)}
                                            title="Delete contract"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>

                                    <div className="card-separator"></div>

                                    <div className="contract-header">
                                        <div className="contract-icon">📄</div>
                                        {getStatusBadge(contract.status, contract.riskScore)}
                                    </div>
                                    <div className="contract-info">
                                        {editingCard?.contractId === contract.contractId ? (
                                            // Inline Edit Mode
                                            <div className="inline-edit-form" onClick={(e) => e.preventDefault()}>
                                                <div className="edit-field">
                                                    <label>📄 Filename</label>
                                                    <div className="edit-input-row">
                                                        <input
                                                            type="text"
                                                            value={editingCard.fileName}
                                                            onChange={(e) => setEditingCard({ ...editingCard, fileName: e.target.value })}
                                                            className="inline-edit-input"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <span className="file-ext">.pdf</span>
                                                    </div>
                                                </div>
                                                <div className="edit-field">
                                                    <label>📍 Address</label>
                                                    <input
                                                        type="text"
                                                        value={editingCard.propertyAddress}
                                                        onChange={(e) => setEditingCard({ ...editingCard, propertyAddress: e.target.value })}
                                                        className="inline-edit-input"
                                                        placeholder="Property address"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="edit-field">
                                                    <label>👤 Landlord</label>
                                                    <input
                                                        type="text"
                                                        value={editingCard.landlordName}
                                                        onChange={(e) => setEditingCard({ ...editingCard, landlordName: e.target.value })}
                                                        className="inline-edit-input"
                                                        placeholder="Landlord name"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className="edit-actions">
                                                    <button className="edit-save-btn" onClick={saveEdit} disabled={isSaving}>
                                                        {isSaving ? '...' : '✓'}
                                                    </button>
                                                    <button className="edit-cancel-btn" onClick={cancelEdit}>
                                                        ✗
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // Normal Display Mode
                                            <>
                                                <h3>{contract.fileName || 'Contract'}</h3>
                                                {contract.propertyAddress && (
                                                    <p className="contract-meta">📍 {contract.propertyAddress}</p>
                                                )}
                                                {contract.landlordName && (
                                                    <p className="contract-meta">👤 {contract.landlordName}</p>
                                                )}
                                                <p className="contract-date">
                                                    📅 Uploaded: {formatDate(contract.uploadDate)}
                                                </p>
                                                {contract.analyzedDate && (
                                                    <p className="contract-date analyzed">
                                                        ✅ Analyzed: {formatDate(contract.analyzedDate)}
                                                    </p>
                                                )}
                                                {contract.riskScore !== undefined && (
                                                    <p className="risk-score">
                                                        Risk Score: <strong>{contract.riskScore}</strong>/100
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="contract-footer">
                                        <span className="view-action">View Details →</span>
                                    </div>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            )
            }

            <div className="contracts-actions">
                <Button
                    variant="secondary"
                    onClick={() => fetchContracts(true)}
                    loading={isRefreshing}
                >
                    🔄 Refresh Contracts
                </Button>
            </div>
        </div >
    );
};

export default ContractsPage;
