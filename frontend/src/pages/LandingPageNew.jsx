/**
 * ============================================
 *  LandingPageNew
 *  Public Landing Page & Authentication
 * ============================================
 * 
 * STRUCTURE:
 * - Navbar with auth buttons
 * - Hero section with product demo mockups
 * - Benefits carousel
 * - Live demo mockups (Dashboard, Contracts, Viewer)
 * - FAQ section
 * - Footer
 * 
 * FEATURES:
 * - Login/Register/Confirm modals
 * - Forgot password flow
 * - Email verification with resend
 * - Framer Motion animations
 * - Auto-advancing benefits carousel
 * - Registration prompt for non-authenticated users
 * 
 * DEPENDENCIES:
 * - AuthContext: login, register, confirmRegistration
 * - framer-motion: animations
 * - Footer component (shared)
 * 
 * ============================================
 */
import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemeToggle } from '../components/Toggle';
import LanguageToggle from '../components/LanguageToggle';
import Button from '../components/Button';
import Input from '../components/Input';
import { Upload, Brain, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield, Download, Edit2, Trash2, X, Cloud, Bot, Lock, Zap, Pause, Wallet, House } from 'lucide-react';
import Footer from '../components/Footer';
import './LandingPageNew.css';

// Some eslint setups don't count JSX member expressions (e.g. <motion.div>) as a variable usage.
// This keeps the import from being flagged as unused while preserving the current Framer Motion usage.
void motion;

// Registration Prompt Modal Component
const RegisterPromptModal = ({ isOpen, onClose, onRegister, isRTL }) => {
    if (!isOpen) return null;
    return (
        <div className="register-prompt-backdrop" onClick={onClose}>
            <div className="register-prompt-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="modal-icon">
                    <Shield size={48} />
                </div>
                <h3>{isRTL ? 'הרשמה נדרשת' : 'Registration Required'}</h3>
                <p>
                    {isRTL
                        ? 'כדי להעלות ולנתח חוזים, יש להירשם לאתר בחינם.'
                        : 'To upload and analyze contracts, please register for free.'}
                </p>
                <button className="cta-btn large" onClick={onRegister}>
                    {isRTL ? 'הרשמה חינם' : 'Register Free'}
                </button>
                <p className="modal-note">
                    {isRTL ? 'ללא צורך בכרטיס אשראי' : 'No credit card required'}
                </p>
            </div>
        </div>
    );
};

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const staggerChildren = {
    visible: { transition: { staggerChildren: 0.12 } }
};

// ===== CSS MOCKUPS - Matching actual app design =====

// Dashboard Mockup (exactly like UploadPage)
const DashboardMockup = ({ isRTL, onUploadClick }) => (
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
const ContractsGridMockup = ({ isRTL, onViewClick }) => (
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
const ContractViewerMockup = ({ isRTL, onScoreClick }) => (
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

// ===== MAIN LANDING PAGE =====

const LandingPageNew = () => {
    // DAN DID IT - Added forgotPassword and resetUserPassword from useAuth for forgot password feature
    const { login, socialLogin, register, confirmRegistration, isAuthenticated, resendCode, forgotPassword, resetUserPassword, checkUserStatus } = useAuth();
    const { t, isRTL } = useLanguage();

    const getPendingVerificationEmail = () => {
        try {
            return localStorage.getItem('rentguard_pending_verification') || '';
        } catch {
            return '';
        }
    };

    // Auth form state
    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tempEmail, setTempEmail] = useState(() => getPendingVerificationEmail());
    const dropdownRef = useRef(null);

    // DAN DID IT - Added state variables for forgot password flow
    // Forgot password state
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // DAN DID IT - State for verification success modal
    const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);

    // Track user existence for guidance buttons
    const [userExistsStatus, setUserExistsStatus] = useState(null); // 'EXISTS' | 'NEEDS_VERIFICATION' | null

    // Registration prompt state
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

    // Carousel state
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const benefits = [
        {
            icon: Cloud,
            titleHe: 'אחסון ענן מאובטח',
            titleEn: 'Secure Cloud Storage',
            descHe: 'כל החוזים שלך מאוחסנים בצורה מאובטחת בענן AWS עם הצפנה מלאה.',
            descEn: 'All your contracts are securely stored in AWS cloud with full encryption.'
        },
        {
            icon: Bot,
            titleHe: 'ניתוח AI מתקדם',
            titleEn: 'Advanced AI Analysis',
            descHe: 'בינה מלאכותית מתקדמת מזהה סעיפים בעייתיים ומצביעה על סיכונים.',
            descEn: 'Advanced AI identifies problematic clauses and highlights risks.'
        },
        {
            icon: Lock,
            titleHe: 'פרטיות מלאה',
            titleEn: 'Full Privacy',
            descHe: 'המידע האישי שלך מוסתר אוטומטית לפני הניתוח ומוחזר אחריו.',
            descEn: 'Your personal info is automatically hidden before analysis and restored after.'
        },
        {
            icon: Zap,
            titleHe: 'תוצאות בשניות',
            titleEn: 'Results in Seconds',
            descHe: 'קבל ניתוח מלא של החוזה תוך פחות מדקה, בלי צורך בעורך דין.',
            descEn: 'Get full contract analysis in under a minute, no lawyer needed.'
        },
    ];

    // Scroll refs
    const carouselRef = useRef(null);
    const contractsRef = useRef(null);
    const featureRef = useRef(null);
    const carouselInView = useInView(carouselRef, { once: true, margin: '-80px' });
    const contractsInView = useInView(contractsRef, { once: true, margin: '-80px' });
    const featureInView = useInView(featureRef, { once: true, margin: '-80px' });

    

    // Close modal on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                if (!e.target.closest('.cta-btn') && !e.target.closest('.auth-btn')) {
                    setAuthModal(null);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Carousel auto-advance
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % benefits.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isPaused, benefits.length]);

    if (isAuthenticated) {
        localStorage.removeItem('rentguard_pending_verification');
        return <Navigate to="/dashboard" replace />;
    }

    // DAN DID IT - Helper function to translate AWS Cognito errors to Hebrew
    const translateError = (errorMessage) => {
        if (!isRTL) return errorMessage; // Return English as-is

        const errorTranslations = {
            'Attempt limit exceeded, please try after some time': 'חרגת ממספר הניסיונות המותר, נסה שוב מאוחר יותר',
            'Invalid verification code provided': 'קוד אימות שגוי',
            'User does not exist': 'משתמש לא קיים',
            'Incorrect username or password': 'שם משתמש או סיסמה שגויים',
            'Password did not conform with policy': 'הסיסמה לא עומדת בדרישות המערכת',
            'An account with the given email already exists': 'כתובת האימייל כבר קיימת במערכת',
            'Invalid password format': 'פורמט סיסמה לא תקין',
            'Cannot reset password for the user as there is no registered/verified email': 'לא ניתן לאפס סיסמה - אין אימייל רשום',
            'User is disabled': 'המשתמש מושבת',
            'Failed to send reset code': 'שליחת קוד איפוס נכשלה',
            'Failed to reset password': 'איפוס הסיסמה נכשל',
            'Code mismatch': 'קוד שגוי',
            'Expired code': 'הקוד פג תוקף'
        };

        // Check for exact match
        if (errorTranslations[errorMessage]) {
            return errorTranslations[errorMessage];
        }

        // Check for partial matches
        for (const [english, hebrew] of Object.entries(errorTranslations)) {
            if (errorMessage.includes(english)) {
                return hebrew;
            }
        }

        return errorMessage; // Return original if no translation found
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Validate empty/whitespace
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const result = await login(trimmedEmail, password);
        if (!result.success) {
            setError(translateError(result.error || 'Login failed'));
        } else {
            try {
                localStorage.removeItem('rentguard_pending_verification');
            } catch {
                // ignore
            }
        }
        setLoading(false);
    };

    const handleSocialLogin = async (provider) => {
        setError('');
        setLoading(true);

        const result = await socialLogin(provider);
        if (!result?.success) {
            setError(translateError(result?.error || (isRTL ? 'ההתחברות נכשלה' : 'Social login failed')));
            setLoading(false);
        }
        // On success, Cognito Hosted UI redirects away from this page.
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (isAuthenticated) {
            setError(isRTL ? 'כדי להירשם, התנתק קודם מהחשבון הנוכחי' : 'To register, please log out from the current account first');
            return;
        }

        // Trim all inputs
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        // Validate empty/whitespace fields
        if (!trimmedName || !trimmedEmail || !password) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
            return;
        }

        // Check name length
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError(isRTL ? 'שם חייב להיות בין 2-50 תווים' : 'Name must be 2-50 characters');
            return;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            setError(isRTL ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
            return;
        }

        setLoading(true);
        setUserExistsStatus(null);

        // Step 1: Check if user already exists using our custom backend
        const check = await checkUserStatus(trimmedEmail);
        
        if (check.status === 'EXISTS') {
            setError(isRTL ? 'נראה שכבר יש לך חשבון!' : 'It looks like you already have an account!');
            setUserExistsStatus('EXISTS');
            setLoading(false);
            return;
        }

        if (check.status === 'NEEDS_VERIFICATION') {
            setError(isRTL ? 'החשבון קיים אך דורש אימות.' : 'Account exists but requires verification.');
            setUserExistsStatus('NEEDS_VERIFICATION');
            // Try to resend code automatically
            try { await resendCode(trimmedEmail); } catch (e) { console.error(e); }
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            setAuthModal('confirm');
            setLoading(false);
            return;
        }

        // Step 2: Proceed with normal registration
        const result = await register(trimmedEmail, password, trimmedName);
        if (result.success) {
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            setAuthModal('confirm');
        } else {
            // Translate common errors
            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Password')) errorMsg = 'הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה, אות קטנה ומספר';
                else if (errorMsg.includes('email')) errorMsg = 'כתובת אימייל לא תקינה';
                else if (errorMsg.includes('already exists')) errorMsg = 'המשתמש כבר קיים במערכת';
                else errorMsg = 'ההרשמה נכשלה. נסה שוב.';
            }
            setError(errorMsg);
        }
        setLoading(false);
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await confirmRegistration(tempEmail, code);
        if (result.success) {
            localStorage.removeItem('rentguard_pending_verification');
            setLoading(false);
            // DAN DID IT - Show success modal instead of immediately going to login
            setShowVerificationSuccess(true);
        } else {
            // Translate errors to Hebrew
            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Invalid') || errorMsg.includes('code')) errorMsg = 'קוד אימות שגוי';
                else if (errorMsg.includes('expired')) errorMsg = 'הקוד פג תוקף. לחץ על שלח קוד חדש';
                else errorMsg = 'האימות נכשל. נסה שוב.';
            }
            setError(errorMsg);
            setLoading(false);
        }
    };

    // DAN DID IT - Handle continuing to login after verification success
    const handleContinueToLogin = () => {
        setShowVerificationSuccess(false);
        setAuthModal('login');
        setEmail(tempEmail);
    };

    const handleResendCode = async () => {
        setError('');
        setLoading(true);
        try {
            await resendCode(tempEmail);
            setError(isRTL ? 'קוד חדש נשלח לאימייל שלך' : 'New code sent to your email');
        } catch {
            setError(isRTL ? 'שליחת הקוד נכשלה. נסה שוב.' : 'Failed to resend code. Try again.');
        }
        setLoading(false);
    };

    const clearPendingVerification = () => {
        try {
            localStorage.removeItem('rentguard_pending_verification');
        } catch {
            // ignore
        }
        setError('');
        setCode('');
        setTempEmail('');
        setAuthModal('register');
    };

    // DAN DID IT - Added handleForgotPassword to send reset code to user's email
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError(isRTL ? 'יש להזין כתובת אימייל' : 'Please enter email address');
            return;
        }

        setLoading(true);
        const result = await forgotPassword(trimmedEmail);
        if (result.success) {
            setTempEmail(trimmedEmail);
            setAuthModal('resetPassword');
        } else {
            setError(translateError(result.error || 'Failed to send reset code'));
        }
        setLoading(false);
    };

    // DAN DID IT - Added handleResetPassword to reset password with code and new password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!resetCode.trim() || !newPassword.trim()) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const result = await resetUserPassword(tempEmail, resetCode, newPassword);
        if (result.success) {
            setAuthModal('login');
            setEmail(tempEmail);
            setPassword('');
            setResetCode('');
            setNewPassword('');
            // Show success message (optional)
            setError('');
        } else {
            setError(translateError(result.error || 'Failed to reset password'));
        }
        setLoading(false);
    };

    // Added handleResendResetCode to resend password reset code
    const handleResendResetCode = async () => {
        setError('');
        setLoading(true);
        try {
            await forgotPassword(tempEmail);
            setError(isRTL ? 'קוד חדש נשלח לאימייל שלך' : 'New code sent to your email');
        } catch {
            setError(isRTL ? 'שליחת הקוד נכשלה. נסה שוב.' : 'Failed to resend code. Try again.');
        }
        setLoading(false);
    };

    const toggleAuth = (type) => {
        // Check if user has pending verification
        const pendingEmail = localStorage.getItem('rentguard_pending_verification');
        if (type === 'register' && pendingEmail) {
            setTempEmail(String(pendingEmail || '').trim().toLowerCase());
            setError('');
            setAuthModal('confirm');
            return;
        }
        setError('');
        setAuthModal(authModal === type ? null : type);
    };

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + benefits.length) % benefits.length);
    const CurrentBenefitIcon = benefits[currentSlide].icon;

    return (
        <div className="landing-real" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ===== NAVBAR ===== */}
            <nav className="lr-nav">
                <div className="lr-nav-inner">
                    <a href="/" className="lr-logo">
                        <Shield size={24} className="logo-icon" />
                        <span>RentGuard 360</span>
                    </a>
                    <div className="lr-nav-right">
                        <LanguageToggle />
                        <ThemeToggle />
                        <button className="auth-btn" onClick={() => toggleAuth('login')}>
                            {t('auth.login')}
                        </button>
                        <button className="cta-btn" onClick={() => toggleAuth('register')}>
                            {isRTL ? 'התחל חינם' : 'Start Free'}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Auth Modal */}
            {authModal && (
                <div className="auth-backdrop" onClick={() => setAuthModal(null)}>
                    <div className="auth-modal" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                        <button className="auth-modal-close" onClick={() => setAuthModal(null)} aria-label="Close">
                            <X size={20} />
                        </button>
                        {authModal === 'login' && (
                            <form onSubmit={handleLogin} className="auth-form">
                                <h3>{t('auth.login')}</h3>
                                <div className="auth-social-group">
                                    <button
                                        type="button"
                                        className="auth-social-btn google"
                                        onClick={() => handleSocialLogin('Google')}
                                        disabled={loading}
                                    >
                                        {isRTL ? 'התחברות עם Google' : 'Sign in with Google'}
                                    </button>
                                    <button
                                        type="button"
                                        className="auth-social-btn facebook"
                                        onClick={() => {}}
                                    >
                                        {isRTL ? 'התחברות עם Facebook' : 'Sign in with Facebook'}
                                    </button>
                                </div>
                                <div className="auth-divider">
                                    <span>{isRTL ? 'או עם אימייל' : 'or with email'}</span>
                                </div>
                                <Input type="email" label={t('auth.email')} value={email}
                                    onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input type="password" label={t('auth.password')} value={password}
                                    onChange={(e) => setPassword(e.target.value)} required maxLength={128} />
                                {/* DAN DID IT - Added "Forgot Password?" button to login form */}
                                <button
                                    type="button"
                                    onClick={() => setAuthModal('forgotPassword')}
                                    className="forgot-password-link"
                                    style={{
                                        alignSelf: isRTL ? 'flex-start' : 'flex-end',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        marginTop: '-0.5rem',
                                        marginBottom: '0.5rem',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {t('auth.forgotPassword')}
                                </button>
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
                                    {t('auth.loginButton')}
                                </Button>
                                <p className="auth-switch">
                                    {t('auth.noAccount')}{' '}
                                    <button type="button" onClick={() => toggleAuth('register')}>
                                        {t('auth.register')}
                                    </button>
                                </p>
                            </form>
                        )}
                        {authModal === 'register' && (
                            <form onSubmit={handleRegister} className="auth-form">
                                <h3>{t('auth.register')}</h3>
                                <div className="auth-social-group">
                                    <button
                                        type="button"
                                        className="auth-social-btn google"
                                        onClick={() => handleSocialLogin('Google')}
                                        disabled={loading}
                                    >
                                        {isRTL ? 'הרשמה עם Google' : 'Continue with Google'}
                                    </button>
                                    <button
                                        type="button"
                                        className="auth-social-btn facebook"
                                        onClick={() => {}}
                                    >
                                        {isRTL ? 'הרשמה עם Facebook' : 'Continue with Facebook'}
                                    </button>
                                </div>
                                <div className="auth-divider">
                                    <span>{isRTL ? 'או הרשמה באימייל' : 'or sign up with email'}</span>
                                </div>
                                <Input label={t('auth.fullName')} value={name}
                                    onChange={(e) => setName(e.target.value)} required maxLength={50} />
                                <Input type="email" label={t('auth.email')} value={email}
                                    onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input type="password" label={t('auth.password')} value={password}
                                    onChange={(e) => setPassword(e.target.value)} required maxLength={128}
                                    helperText={t('auth.passwordHint')} />
                                <Input type="password" label={isRTL ? 'אימות סיסמה' : 'Confirm Password'} value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)} required maxLength={128} />
                                
                                {error && <p className="auth-error">{error}</p>}

                                {userExistsStatus === 'EXISTS' && (
                                    <div className="auth-guidance">
                                        <Button variant="outline" fullWidth onClick={() => { setAuthModal('login'); setEmail(email); }}>
                                            {t('auth.loginButton')}
                                        </Button>
                                        <Button variant="ghost" fullWidth onClick={() => { setAuthModal('forgotPassword'); setEmail(email); }}>
                                            {isRTL ? 'שכחתי סיסמה' : 'Forgot Password'}
                                        </Button>
                                    </div>
                                )}

                                <Button variant="primary" fullWidth loading={loading} type="submit" disabled={userExistsStatus === 'EXISTS'}>
                                    {t('auth.registerButton')}
                                </Button>
                                <p className="auth-switch">
                                    {t('auth.hasAccount')}{' '}
                                    <button type="button" onClick={() => toggleAuth('login')}>
                                        {t('auth.login')}
                                    </button>
                                </p>
                            </form>
                        )}
                        {authModal === 'confirm' && (
                            <form onSubmit={handleConfirm} className="auth-form">
                                <h3>{t('auth.confirmTitle')}</h3>
                                <p className="confirm-msg">{t('auth.confirmMessage')} <strong>{tempEmail}</strong></p>
                                <Input label={t('auth.confirmCode')} value={code}
                                    onChange={(e) => setCode(e.target.value)} required placeholder="123456" maxLength={6} />
                                {error && <p className={error.includes('נשלח') || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
                                    {t('auth.confirmButton')}
                                </Button>
                                <p className="auth-switch">
                                    {isRTL ? 'לא קיבלת את הקוד?' : "Didn't receive the code?"}{' '}
                                    <button type="button" onClick={handleResendCode} disabled={loading}>
                                        {isRTL ? 'שלח קוד חדש' : 'Resend Code'}
                                    </button>
                                </p>
                                <p className="auth-switch">
                                    {isRTL ? 'טעית באימייל?' : 'Wrong email?'}{' '}
                                    <button type="button" onClick={clearPendingVerification} disabled={loading}>
                                        {isRTL ? 'הירשם מחדש' : 'Register again'}
                                    </button>
                                </p>
                            </form>
                        )}
                        {/* DAN DID IT - Added forgot password modal where user enters email to receive reset code */}
                        {authModal === 'forgotPassword' && (
                            <form onSubmit={handleForgotPassword} className="auth-form">
                                <h3>{t('auth.forgotPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.forgotPasswordMessage')}</p>
                                <Input type="email" label={t('auth.email')} value={email}
                                    onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
                                    {t('auth.sendCodeButton')}
                                </Button>
                                <p className="auth-switch">
                                    <button type="button" onClick={() => toggleAuth('login')}>
                                        {t('auth.backToLogin')}
                                    </button>
                                </p>
                            </form>
                        )}
                        {/* DAN DID IT - Added reset password modal where user enters code and new password */}
                        {authModal === 'resetPassword' && (
                            <form onSubmit={handleResetPassword} className="auth-form">
                                <h3>{t('auth.resetPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.resetPasswordMessage')} <strong>{tempEmail}</strong></p>
                                <Input label={t('auth.confirmCode')} value={resetCode}
                                    onChange={(e) => setResetCode(e.target.value)} required placeholder={t('auth.resetCodePlaceholder')} maxLength={6} />
                                <Input type="password" label={t('auth.newPassword')} value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)} required maxLength={128}
                                    helperText={t('auth.passwordHint')} />
                                {error && <p className={error.includes('נשלח') || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
                                    {t('auth.resetPasswordButton')}
                                </Button>
                                <p className="auth-switch">
                                    {isRTL ? 'לא קיבלת את הקוד?' : "Didn't receive the code?"}{' '}
                                    <button type="button" onClick={handleResendResetCode} disabled={loading}>
                                        {isRTL ? 'שלח קוד חדש' : 'Resend Code'}
                                    </button>
                                </p>
                                <p className="auth-switch">
                                    <button type="button" onClick={() => toggleAuth('login')}>
                                        {t('auth.backToLogin')}
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ===== HERO SECTION ===== */}
            <section className="lr-hero">
                <motion.div
                    className="hero-text"
                    initial="hidden"
                    animate="visible"
                    variants={staggerChildren}
                >
                    <motion.h1 variants={fadeInUp}>
                        RentGuard 360
                        <br />
                        <span className="hero-subtitle-line">
                            {isRTL ? 'ההגנה שלך בחוזה השכירות' : 'Your Rental Contract Guardian'}
                        </span>
                    </motion.h1>
                    <motion.p variants={fadeInUp} className="hero-desc">
                        {isRTL
                            ? 'ניתוח חוזים חכם מבוסס AI. פשוט גרור את הקובץ וקבל תמונת מצב משפטית בשניות.'
                            : 'Smart AI-powered contract analysis. Simply drag your file and get a legal snapshot in seconds.'}
                    </motion.p>
                    <motion.div variants={fadeInUp} className="hero-cta">
                        <button className="cta-btn large" onClick={() => toggleAuth('register')}>
                            {isRTL ? 'התחל ניתוח חינם' : 'Start Free Analysis'}
                        </button>
                        <span className="cta-note highlight">
                            {isRTL ? 'ללא צורך בכרטיס אשראי' : 'No credit card required'}
                        </span>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, y: 40, rotateY: -5 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <DashboardMockup isRTL={isRTL} onUploadClick={() => setShowRegisterPrompt(true)} />
                </motion.div>
            </section>

            {/* ===== BENEFITS CAROUSEL ===== */}
            <section className="lr-carousel" ref={carouselRef}>
                <motion.div
                    className="benefits-carousel"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    initial={{ opacity: 0, y: 30 }}
                    animate={carouselInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {isPaused && <span className="carousel-paused"><Pause size={14} /></span>}
                    <button
                        className="carousel-arrow"
                        onClick={prevSlide}
                        aria-label="Previous"
                    >
                        ‹
                    </button>
                    <div className="carousel-content" key={currentSlide}>
                        <div className="carousel-icon"><CurrentBenefitIcon size={34} strokeWidth={1.9} /></div>
                        <h4>{isRTL ? benefits[currentSlide].titleHe : benefits[currentSlide].titleEn}</h4>
                        <p>{isRTL ? benefits[currentSlide].descHe : benefits[currentSlide].descEn}</p>
                    </div>
                    <button
                        className="carousel-arrow"
                        onClick={nextSlide}
                        aria-label="Next"
                    >
                        ›
                    </button>
                </motion.div>
                <div className="carousel-dots">
                    {benefits.map((_, idx) => (
                        <button
                            key={idx}
                            className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(idx)}
                            aria-label={`Slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </section>

            {/* ===== LIVE DEMO PREVIEW ===== */}
            <section className="lr-contracts" ref={contractsRef}>
                <motion.div
                    className="section-header"
                    initial="hidden"
                    animate={contractsInView ? 'visible' : 'hidden'}
                    variants={fadeInUp}
                >
                    <h2>{isRTL ? 'ראה איך זה נראה במציאות' : 'See it in action'}</h2>
                    <p>{isRTL ? 'דוגמה לניתוח תיק חוזים של משתמש' : 'Example of a user\'s contract portfolio analysis'}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={contractsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <ContractsGridMockup isRTL={isRTL} onViewClick={() => setShowRegisterPrompt(true)} />
                </motion.div>
            </section>

            {/* ===== FEATURE: CONTRACT VIEWER ===== */}
            <section className="lr-feature" ref={featureRef}>
                <motion.div
                    className="feature-visual"
                    initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
                    animate={featureInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    <ContractViewerMockup isRTL={isRTL} onScoreClick={() => setShowRegisterPrompt(true)} />
                </motion.div>

                <motion.div
                    className="feature-text"
                    initial="hidden"
                    animate={featureInView ? 'visible' : 'hidden'}
                    variants={staggerChildren}
                >
                    <motion.h2 variants={fadeInUp}>
                        {isRTL ? 'זיהוי סעיפים בעייתיים' : 'Identify Problematic Clauses'}
                    </motion.h2>
                    <motion.p variants={fadeInUp}>
                        {isRTL
                            ? 'המערכת מזהה אוטומטית סעיפים שעלולים לפגוע בזכויותיך ומספקת הסבר בשפה פשוטה.'
                            : 'The system automatically identifies clauses that may harm your rights and provides plain-language explanations.'}
                    </motion.p>
                    <motion.ul variants={fadeInUp} className="feature-list">
                        <li>
                            <CheckCircle size={18} />
                            {isRTL ? 'מבוסס על חוק השכירות 2017' : 'Based on 2017 Rental Law'}
                        </li>
                        <li>
                            <CheckCircle size={18} />
                            {isRTL ? 'הצעות תיקון מידיות' : 'Instant fix suggestions'}
                        </li>
                        <li>
                            <CheckCircle size={18} />
                            {isRTL ? 'ציון סיכון לכל קטגוריה' : 'Risk score per category'}
                        </li>
                    </motion.ul>
                </motion.div>
            </section>

            {/* ===== FOOTER ===== */}
            <Footer />

            {/* Registration Prompt Modal */}
            <RegisterPromptModal
                isOpen={showRegisterPrompt}
                onClose={() => setShowRegisterPrompt(false)}
                onRegister={() => {
                    setShowRegisterPrompt(false);
                    toggleAuth('register');
                }}
                isRTL={isRTL}
            />

            {/* DAN DID IT - Verification Success Modal */}
            {showVerificationSuccess && (
                <div className="auth-backdrop">
                    <div className="auth-modal" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: 'center', maxWidth: '420px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                                <circle cx="30" cy="30" r="28" stroke="#10B981" strokeWidth="3" fill="rgba(16, 185, 129, 0.1)" />
                                <path d="M20 30L26 36L40 22" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        <h2 style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--text-primary)',
                            marginBottom: '1rem'
                        }}>
                            {t('auth.verificationSuccess')}
                        </h2>

                        <p style={{
                            fontSize: 'var(--font-size-md)',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6',
                            marginBottom: '1.5rem'
                        }}>
                            {t('auth.verificationSuccessMessage')}
                        </p>

                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleContinueToLogin}
                        >
                            {t('auth.continueToLogin')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageNew;
