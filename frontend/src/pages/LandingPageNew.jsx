import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemeToggle } from '../components/Toggle';
import LanguageToggle from '../components/LanguageToggle';
import Button from '../components/Button';
import Input from '../components/Input';
import { Upload, Brain, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield, Download, Edit2, Trash2 } from 'lucide-react';
import Footer from '../components/Footer';
import './LandingPageNew.css';

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
const DashboardMockup = ({ isRTL }) => (
    <div className="mockup-dashboard-real">
        {/* Header Bar */}
        <div className="mock-header">
            <span className="mock-logo">🛡️ RentGuard 360</span>
            <div className="mock-nav">
                <span className="mock-nav-item active">{isRTL ? 'לוח בקרה' : 'Dashboard'}</span>
                <span className="mock-nav-item">{isRTL ? 'חוזים' : 'Contracts'}</span>
            </div>
        </div>

        {/* Upload Zone - Exactly like our UploadPage */}
        <div className="mock-upload-zone">
            <div className="mock-upload-icon">
                <Upload size={48} strokeWidth={1.5} />
            </div>
            <p className="mock-upload-title">
                {isRTL ? 'גרור חוזה לכאן להעלאה' : 'Drag contract here to upload'}
            </p>
            <p className="mock-upload-hint">
                {isRTL ? 'או לחץ לבחירת קובץ • PDF עד 25MB' : 'or click to select file • PDF up to 25MB'}
            </p>
            <button className="mock-upload-btn">
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
const ContractsGridMockup = ({ isRTL }) => (
    <div className="mockup-contracts-grid">
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
                <button className="action-link">{isRTL ? 'צפה בניתוח' : 'View Analysis'}</button>
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
const ContractViewerMockup = ({ isRTL }) => (
    <div className="mockup-viewer-real">
        {/* Sidebar Score Summary */}
        <div className="mock-sidebar">
            <div className="mock-score-circle">
                <span className="mock-score-value">62</span>
                <span className="mock-score-label">/100</span>
            </div>
            <span className="mock-risk-badge warning">{isRTL ? 'סיכון בינוני' : 'Medium Risk'}</span>
            <div className="mock-breakdown">
                <div className="breakdown-item">
                    <span>💰</span>
                    <span className="breakdown-bar"><div style={{ width: '70%' }}></div></span>
                    <span>14/20</span>
                </div>
                <div className="breakdown-item">
                    <span>🏠</span>
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
    const { login, register, confirmRegistration, isAuthenticated, resendCode } = useAuth();
    const { t, isRTL } = useLanguage();

    // Auth form state
    const [authModal, setAuthModal] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tempEmail, setTempEmail] = useState('');
    const dropdownRef = useRef(null);

    // Carousel state
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const benefits = [
        {
            icon: '☁️',
            titleHe: 'אחסון ענן מאובטח',
            titleEn: 'Secure Cloud Storage',
            descHe: 'כל החוזים שלך מאוחסנים בצורה מאובטחת בענן AWS עם הצפנה מלאה.',
            descEn: 'All your contracts are securely stored in AWS cloud with full encryption.'
        },
        {
            icon: '🤖',
            titleHe: 'ניתוח AI מתקדם',
            titleEn: 'Advanced AI Analysis',
            descHe: 'בינה מלאכותית מתקדמת מזהה סעיפים בעייתיים ומצביעה על סיכונים.',
            descEn: 'Advanced AI identifies problematic clauses and highlights risks.'
        },
        {
            icon: '🔒',
            titleHe: 'פרטיות מלאה',
            titleEn: 'Full Privacy',
            descHe: 'המידע האישי שלך מוסתר אוטומטית לפני הניתוח ומוחזר אחריו.',
            descEn: 'Your personal info is automatically hidden before analysis and restored after.'
        },
        {
            icon: '⚡',
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

    // Resume pending verification
    useEffect(() => {
        const pendingEmail = localStorage.getItem('rentguard_pending_verification');
        if (pendingEmail && !isAuthenticated) {
            setTempEmail(pendingEmail);
            setAuthModal('confirm');
        }
    }, [isAuthenticated]);

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

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(email, password);
        if (!result.success) setError(result.error || 'Login failed');
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Check if passwords match
        if (password !== confirmPassword) {
            setError(isRTL ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
            return;
        }

        setLoading(true);
        const result = await register(email, password, name);
        if (result.success) {
            setTempEmail(email);
            localStorage.setItem('rentguard_pending_verification', email);
            setAuthModal('confirm');
        } else {
            setError(result.error || 'Registration failed');
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
            setAuthModal('login');
            setEmail(tempEmail);
        } else {
            setError(result.error || 'Verification failed');
        }
        setLoading(false);
    };

    const toggleAuth = (type) => {
        setError('');
        setAuthModal(authModal === type ? null : type);
    };

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + benefits.length) % benefits.length);

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
                        {authModal === 'login' && (
                            <form onSubmit={handleLogin} className="auth-form">
                                <h3>{t('auth.login')}</h3>
                                <Input type="email" label={t('auth.email')} value={email}
                                    onChange={(e) => setEmail(e.target.value)} required />
                                <Input type="password" label={t('auth.password')} value={password}
                                    onChange={(e) => setPassword(e.target.value)} required />
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
                                <Input label={t('auth.fullName')} value={name}
                                    onChange={(e) => setName(e.target.value)} required />
                                <Input type="email" label={t('auth.email')} value={email}
                                    onChange={(e) => setEmail(e.target.value)} required />
                                <Input type="password" label={t('auth.password')} value={password}
                                    onChange={(e) => setPassword(e.target.value)} required
                                    helperText={t('auth.passwordHint')} />
                                <Input type="password" label={isRTL ? 'אימות סיסמה' : 'Confirm Password'} value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)} required />
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
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
                                    onChange={(e) => setCode(e.target.value)} required placeholder="123456" />
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">
                                    {t('auth.confirmButton')}
                                </Button>
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
                            ✨ {isRTL ? 'ללא צורך בכרטיס אשראי' : 'No credit card required'}
                        </span>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, y: 40, rotateY: -5 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <DashboardMockup isRTL={isRTL} />
                </motion.div>
            </section>

            {/* ===== BENEFITS CAROUSEL ===== */}
            <section className="lr-carousel" ref={carouselRef}>
                <motion.div
                    className="benefits-carousel"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    initial={{ opacity: 0, y: 30 }}
                    animate={carouselInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {isPaused && <span className="carousel-paused">⏸</span>}
                    <button className="carousel-arrow" onClick={prevSlide} aria-label="Previous">
                        ‹
                    </button>
                    <div className="carousel-content" key={currentSlide}>
                        <div className="carousel-icon">{benefits[currentSlide].icon}</div>
                        <h4>{isRTL ? benefits[currentSlide].titleHe : benefits[currentSlide].titleEn}</h4>
                        <p>{isRTL ? benefits[currentSlide].descHe : benefits[currentSlide].descEn}</p>
                    </div>
                    <button className="carousel-arrow" onClick={nextSlide} aria-label="Next">
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
                    <ContractsGridMockup isRTL={isRTL} />
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
                    <ContractViewerMockup isRTL={isRTL} />
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
        </div>
    );
};

export default LandingPageNew;
