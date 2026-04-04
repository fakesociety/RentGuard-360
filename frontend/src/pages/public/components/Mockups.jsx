import React from 'react';
import { Upload, FileText, Download, Edit2, Trash2, Wallet, House, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext/LanguageContext';

// ===== CSS MOCKUPS - Matching actual app design =====

// Dashboard Mockup (exactly like UploadPage)
export const DashboardMockup = ({ onUploadClick }) => {
    const { t } = useLanguage();

    return (
        <div className="mockup-dashboard-real" onClick={onUploadClick} style={{ cursor: 'pointer' }}>
            {/* Header Bar */}
            <div className="mock-header">
                <span className="mock-logo">
                    <Shield size={14} strokeWidth={2.2} className="mock-logo-icon" />
                    <span>RentGuard 360</span>
                </span>
                <div className="mock-nav">
                    <span className="mock-nav-item active">{t('mockups.dashboard.navDashboard')}</span>
                    <span className="mock-nav-item">{t('mockups.dashboard.navContracts')}</span>
                </div>
            </div>

            {/* Upload Zone - Exactly like our UploadPage */}
            <div className="mock-upload-zone" onClick={onUploadClick} style={{ cursor: 'pointer' }}>
                <div className="mock-upload-icon">
                    <Upload size={48} strokeWidth={1.5} />
                </div>
                <p className="mock-upload-title">
                    {t('mockups.dashboard.uploadTitle')}
                </p>
                <p className="mock-upload-hint">
                    {t('mockups.dashboard.uploadHint')}
                </p>
                <button className="mock-upload-btn" onClick={(e) => { e.stopPropagation(); onUploadClick(); }}>
                    {t('mockups.dashboard.selectFile')}
                </button>
            </div>

            {/* Recent Activity - Like our Dashboard */}
            <div className="mock-activity">
                <h4>{t('mockups.dashboard.recentContracts')}</h4>
                <div className="mock-file-list">
                    <div className="mock-file-item">
                        <FileText size={18} />
                        <span className="mock-file-name">{t('mockups.dashboard.fileNameApartment')}</span>
                        <span className="mock-file-score good">{t('mockups.dashboard.scoreApartment')}</span>
                    </div>
                    <div className="mock-file-item">
                        <FileText size={18} />
                        <span className="mock-file-name">{t('mockups.dashboard.fileNameOffice')}</span>
                        <span className="mock-file-score warning">{t('mockups.dashboard.scoreOffice')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Live Demo - Contracts Grid Mockup (exactly like ContractsPage cards view)
export const ContractsGridMockup = ({ onViewClick }) => {
    const { t } = useLanguage();

    return (
        <div className="mockup-contracts-grid" onClick={onViewClick} style={{ cursor: 'pointer' }}>
            {/* Contract Card 1 - SAFE (Green) */}
            <div className="mock-contract-card">
                <div className="card-top">
                    <div className="card-info">
                        <FileText size={20} className="card-file-icon" />
                        <div>
                            <span className="card-title">{t('mockups.contracts.fileNameSafe')}</span>
                            <span className="card-date">
                                {t('mockups.contracts.analyzedPrefix')} 22.12.2025
                            </span>
                        </div>
                    </div>
                    <div className="card-gauge excellent">
                        <svg viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="95, 100" />
                        </svg>
                        <span>95</span>
                    </div>
                </div>
                <div className="card-badge excellent">{t('mockups.contracts.lowRisk')}</div>
                <div className="card-meta">
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.propertyAddressLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.addressSafe')}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.landlordNameLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.landlordSafe')}</span>
                    </div>
                </div>
                <div className="card-actions">
                    <button className="action-link" onClick={onViewClick}>{t('mockups.contracts.viewAnalysis')}</button>
                    <div className="action-icons">
                        <Download size={16} />
                        <Edit2 size={16} />
                        <Trash2 size={16} />
                    </div>
                </div>
            </div>

            {/* Contract Card 2 - RISKY (Red) */}
            <div className="mock-contract-card risky">
                <div className="card-top">
                    <div className="card-info">
                        <FileText size={20} className="card-file-icon" />
                        <div>
                            <span className="card-title">{t('mockups.contracts.fileNameRisky')}</span>
                            <span className="card-date">
                                {t('mockups.contracts.analyzedPrefix')} 20.12.2025
                            </span>
                        </div>
                    </div>
                    <div className="card-gauge danger">
                        <svg viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="50, 100" />
                        </svg>
                        <span>50</span>
                    </div>
                </div>
                <div className="card-badge danger">{t('mockups.contracts.highRisk')}</div>
                <div className="card-meta">
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.propertyAddressLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.addressRisky')}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.landlordNameLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.landlordRisky')}</span>
                    </div>
                </div>
                <div className="card-actions">
                    <button className="action-link">{t('mockups.contracts.viewAnalysis')}</button>
                    <div className="action-icons">
                        <Download size={16} />
                        <Edit2 size={16} />
                        <Trash2 size={16} />
                    </div>
                </div>
            </div>

            {/* Contract Card 3 - AVERAGE (Orange) */}
            <div className="mock-contract-card">
                <div className="card-top">
                    <div className="card-info">
                        <FileText size={20} className="card-file-icon" />
                        <div>
                            <span className="card-title">{t('mockups.contracts.fileNameMedium')}</span>
                            <span className="card-date">
                                {t('mockups.contracts.analyzedPrefix')} 18.12.2025
                            </span>
                        </div>
                    </div>
                    <div className="card-gauge warning">
                        <svg viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="76, 100" />
                        </svg>
                        <span>76</span>
                    </div>
                </div>
                <div className="card-badge warning">{t('mockups.contracts.mediumRisk')}</div>
                <div className="card-meta">
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.propertyAddressLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.addressMedium')}</span>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">{t('mockups.contracts.landlordNameLabel')}</span>
                        <span className="meta-value">{t('mockups.contracts.landlordMedium')}</span>
                    </div>
                </div>
                <div className="card-actions">
                    <button className="action-link">{t('mockups.contracts.viewAnalysis')}</button>
                    <div className="action-icons">
                        <Download size={16} />
                        <Edit2 size={16} />
                        <Trash2 size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Contract Viewer Mockup (like our AnalysisPage)
export const ContractViewerMockup = ({ onScoreClick }) => {
    const { t } = useLanguage();

    return (
        <div className="mockup-viewer-real" onClick={onScoreClick} style={{ cursor: 'pointer' }}>
            {/* Sidebar Score Summary */}
            <div className="mock-sidebar">
                <div className="mock-score-circle-svg" onClick={onScoreClick} style={{ cursor: 'pointer' }}>
                    <svg viewBox="0 0 36 36" className="circular-progress">
                        {/* Background circle */}
                        <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(245, 158, 11, 0.2)"
                            strokeWidth="3"
                        />
                        {/* Progress circle - 62% */}
                        <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="3"
                            strokeDasharray="62, 100"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="score-text">
                        <span className="mock-score-value">62</span>
                        <span className="mock-score-label">/100</span>
                    </div>
                </div>
                <span className="mock-risk-badge warning">{t('mockups.viewer.mediumRisk')}</span>
                <div className="mock-breakdown">
                    <div className="breakdown-item">
                        <span className="breakdown-icon"><Wallet size={13} strokeWidth={2} /></span>
                        <span className="breakdown-bar"><div style={{ width: '70%' }}></div></span>
                        <span>14/20</span>
                    </div>
                    <div className="breakdown-item">
                        <span className="breakdown-icon"><House size={13} strokeWidth={2} /></span>
                        <span className="breakdown-bar"><div style={{ width: '60%' }}></div></span>
                        <span>12/20</span>
                    </div>
                </div>
            </div>

            {/* Paper View with Clauses */}
            <div className="mock-paper">
                <div className="mock-paper-header">
                    {t('mockups.viewer.contractTitle')}
                </div>

                {/* Collapsed Clause */}
                <div className="mock-clause collapsed">
                    <div className="clause-header">
                        <span className="clause-badge ok">{t('mockups.viewer.okBadge')}</span>
                        <span className="clause-title">{t('mockups.viewer.clauseRentalPeriod')}</span>
                        <ChevronDown size={16} />
                    </div>
                </div>

                {/* Expanded High-Risk Clause */}
                <div className="mock-clause expanded high-risk">
                    <div className="clause-header">
                        <span className="clause-badge danger">{t('mockups.viewer.highRisk')}</span>
                        <span className="clause-title">{t('mockups.viewer.clauseLatePaymentPenalty')}</span>
                        <ChevronUp size={16} />
                    </div>
                    <div className="clause-content">
                        <div className="original-text">
                            <p>
                                {t('mockups.viewer.originalClauseText')}
                            </p>
                        </div>
                        <div className="ai-explanation">
                            <div className="explanation-header">
                                <AlertTriangle size={16} />
                                <span>{t('mockups.viewer.legalExplanation')}</span>
                            </div>
                            <p>
                                {t('mockups.viewer.penaltyExplanation')}
                            </p>
                            <div className="suggested-fix">
                                <CheckCircle size={14} />
                                <span>{t('mockups.viewer.suggestionLabel')}</span>
                                <span className="fix-text">
                                    {t('mockups.viewer.suggestionText')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Another Collapsed Clause */}
                <div className="mock-clause collapsed">
                    <div className="clause-header">
                        <span className="clause-badge ok">{t('mockups.viewer.okBadge')}</span>
                        <span className="clause-title">{t('mockups.viewer.clauseRentAmount')}</span>
                        <ChevronDown size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
};
