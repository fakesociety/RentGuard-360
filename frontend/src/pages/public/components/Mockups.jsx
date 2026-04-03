import React from 'react';
import { Upload, FileText, Download, Edit2, Trash2, Wallet, House, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

// ===== CSS MOCKUPS - Matching actual app design =====

// Dashboard Mockup (exactly like UploadPage)
export const DashboardMockup = ({ isRTL, onUploadClick }) => (
    <div className="mockup-dashboard-real" onClick={onUploadClick} style={{ cursor: 'pointer' }}>
        {/* Header Bar */}
        <div className="mock-header">
            <span className="mock-logo">
                <Shield size={14} strokeWidth={2.2} className="mock-logo-icon" />
                <span>RentGuard 360</span>
            </span>
            <div className="mock-nav">
                <span className="mock-nav-item active">{isRTL ? 'לוח בקרה' : 'Dashboard'}</span>
                <span className="mock-nav-item">{isRTL ? 'חוזים' : 'Contracts'}</span>
            </div>
        </div>

        {/* Upload Zone - Exactly like our UploadPage */}
        <div className="mock-upload-zone" onClick={onUploadClick} style={{ cursor: 'pointer' }}>
            <div className="mock-upload-icon">
                <Upload size={48} strokeWidth={1.5} />
            </div>
            <p className="mock-upload-title">
                {isRTL ? 'גרור חוזה לכאן להעלאה' : 'Drag contract here to upload'}
            </p>
            <p className="mock-upload-hint">
                {isRTL ? 'או לחץ לבחירת קובץ • PDF עד 5MB' : 'or click to select file • PDF up to 5MB'}
            </p>
            <button className="mock-upload-btn" onClick={(e) => { e.stopPropagation(); onUploadClick(); }}>
                {isRTL ? 'בחר קובץ' : 'Select File'}
            </button>
        </div>

        {/* Recent Activity - Like our Dashboard */}
        <div className="mock-activity">
            <h4>{isRTL ? 'חוזים אחרונים' : 'Recent Contracts'}</h4>
            <div className="mock-file-list">
                <div className="mock-file-item">
                    <FileText size={18} />
                    <span className="mock-file-name">{isRTL ? 'חוזה_דירה_תא.pdf' : 'apartment_tlv.pdf'}</span>
                    <span className="mock-file-score good">92</span>
                </div>
                <div className="mock-file-item">
                    <FileText size={18} />
                    <span className="mock-file-name">{isRTL ? 'חוזה_משרד.pdf' : 'office_contract.pdf'}</span>
                    <span className="mock-file-score warning">58</span>
                </div>
            </div>
        </div>
    </div>
);

// Live Demo - Contracts Grid Mockup (exactly like ContractsPage cards view)
export const ContractsGridMockup = ({ isRTL, onViewClick }) => (
    <div className="mockup-contracts-grid" onClick={onViewClick} style={{ cursor: 'pointer' }}>
        {/* Contract Card 1 - SAFE (Green) */}
        <div className="mock-contract-card">
            <div className="card-top">
                <div className="card-info">
                    <FileText size={20} className="card-file-icon" />
                    <div>
                        <span className="card-title">
                            {isRTL ? 'חוזה שכירות - תל אביב.pdf' : 'rental_telaviv.pdf'}
                        </span>
                        <span className="card-date">
                            {isRTL ? 'נותח: 22.12.2025' : 'Analyzed: 22.12.2025'}
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
            <div className="card-badge excellent">{isRTL ? 'סיכון נמוך' : 'LOW RISK'}</div>
            <div className="card-meta">
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'כתובת הנכס:' : 'Property Address:'}</span>
                    <span className="meta-value">{isRTL ? 'דיזנגוף 100, תל אביב' : '100 Dizengoff, Tel Aviv'}</span>
                </div>
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'שם המשכיר:' : 'Landlord Name:'}</span>
                    <span className="meta-value">{isRTL ? 'ישראל ישראלי' : 'Israel Israeli'}</span>
                </div>
            </div>
            <div className="card-actions">
                <button className="action-link" onClick={onViewClick}>{isRTL ? 'צפה בניתוח' : 'View Analysis'}</button>
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
                        <span className="card-title">
                            {isRTL ? 'הסכם שכירות בלתי מוגנת.pdf' : 'unprotected_lease.pdf'}
                        </span>
                        <span className="card-date">
                            {isRTL ? 'נותח: 20.12.2025' : 'Analyzed: 20.12.2025'}
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
            <div className="card-badge danger">{isRTL ? 'סיכון גבוה' : 'HIGH RISK'}</div>
            <div className="card-meta">
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'כתובת הנכס:' : 'Property Address:'}</span>
                    <span className="meta-value">{isRTL ? 'הרצל 45, רמת גן' : '45 Herzl, Ramat Gan'}</span>
                </div>
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'שם המשכיר:' : 'Landlord Name:'}</span>
                    <span className="meta-value">{isRTL ? 'משה כהן' : 'Moshe Cohen'}</span>
                </div>
            </div>
            <div className="card-actions">
                <button className="action-link">{isRTL ? 'צפה בניתוח' : 'View Analysis'}</button>
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
                        <span className="card-title">
                            {isRTL ? 'חוזה חידוש 2025.pdf' : 'renewal_2025.pdf'}
                        </span>
                        <span className="card-date">
                            {isRTL ? 'נותח: 18.12.2025' : 'Analyzed: 18.12.2025'}
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
            <div className="card-badge warning">{isRTL ? 'סיכון בינוני' : 'MEDIUM RISK'}</div>
            <div className="card-meta">
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'כתובת הנכס:' : 'Property Address:'}</span>
                    <span className="meta-value">{isRTL ? 'הנשיא 10, חיפה' : '10 HaNassi, Haifa'}</span>
                </div>
                <div className="meta-row">
                    <span className="meta-label">{isRTL ? 'שם המשכיר:' : 'Landlord Name:'}</span>
                    <span className="meta-value">{isRTL ? 'דוד לוי' : 'David Levi'}</span>
                </div>
            </div>
            <div className="card-actions">
                <button className="action-link">{isRTL ? 'צפה בניתוח' : 'View Analysis'}</button>
                <div className="action-icons">
                    <Download size={16} />
                    <Edit2 size={16} />
                    <Trash2 size={16} />
                </div>
            </div>
        </div>
    </div>
);

// Contract Viewer Mockup (like our AnalysisPage)
export const ContractViewerMockup = ({ isRTL, onScoreClick }) => (
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
            <span className="mock-risk-badge warning">{isRTL ? 'סיכון בינוני' : 'Medium Risk'}</span>
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
                {isRTL ? 'חוזה שכירות בלתי מוגנת' : 'Unprotected Rental Contract'}
            </div>

            {/* Collapsed Clause */}
            <div className="mock-clause collapsed">
                <div className="clause-header">
                    <span className="clause-badge ok">{isRTL ? 'תקין' : 'OK'}</span>
                    <span className="clause-title">{isRTL ? '1. תקופת השכירות' : '1. Rental Period'}</span>
                    <ChevronDown size={16} />
                </div>
            </div>

            {/* Expanded High-Risk Clause */}
            <div className="mock-clause expanded high-risk">
                <div className="clause-header">
                    <span className="clause-badge danger">{isRTL ? 'סיכון גבוה' : 'High Risk'}</span>
                    <span className="clause-title">{isRTL ? '2. קנס איחור בתשלום' : '2. Late Payment Penalty'}</span>
                    <ChevronUp size={16} />
                </div>
                <div className="clause-content">
                    <div className="original-text">
                        <p>
                            {isRTL
                                ? '"במקרה של איחור בתשלום יחויב השוכר בקנס של 500 ₪ ליום ללא הגבלה."'
                                : '"In case of late payment, tenant shall pay 500 NIS per day, unlimited."'}
                        </p>
                    </div>
                    <div className="ai-explanation">
                        <div className="explanation-header">
                            <AlertTriangle size={16} />
                            <span>{isRTL ? 'הסבר משפטי' : 'Legal Explanation'}</span>
                        </div>
                        <p>
                            {isRTL
                                ? 'קנס של 500 ₪ ליום הוא מופרז ועלול להיחשב כסעיף מקפח לפי חוק השכירות 2017.'
                                : 'A penalty of 500 NIS/day is excessive and may be deemed unfair under the 2017 Rental Law.'}
                        </p>
                        <div className="suggested-fix">
                            <CheckCircle size={14} />
                            <span>{isRTL ? 'הצעה: ' : 'Suggestion: '}</span>
                            <span className="fix-text">
                                {isRTL
                                    ? '"קנס איחור של 2% לשבוע, מקסימום 10% מסכום החוב."'
                                    : '"Late fee of 2% per week, maximum 10% of debt."'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Another Collapsed Clause */}
            <div className="mock-clause collapsed">
                <div className="clause-header">
                    <span className="clause-badge ok">{isRTL ? 'תקין' : 'OK'}</span>
                    <span className="clause-title">{isRTL ? '3. דמי שכירות' : '3. Rent Amount'}</span>
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    </div>
);
