/**
 * ============================================
 *  LandingPage
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
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import Navigation from '@/components/layout/Navigation/Navigation';
import { Upload, Brain, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield, Download, Edit2, Trash2, X, Cloud, Bot, Lock, Zap, Pause, Wallet, House } from 'lucide-react';
import './LandingPage.css';

// Some eslint setups don't count JSX member expressions (e.g. <motion.div>) as a variable usage.
// This keeps the import from being flagged as unused while preserving the current Framer Motion usage.
void motion;

// ===== MAIN LANDING PAGE =====

import AuthModal from '@/features/auth/components/AuthModal';
import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';
import RegisterPromptModal from '@/features/auth/components/RegisterPromptModal';

const benefits = [
    {
        icon: Shield,
        titleKey: 'landing.benefitAdvancedAiTitle',
        descKey: 'landing.benefitAdvancedAiDesc'
    },
    {
        icon: Lock,
        titleKey: 'landing.benefitPrivacyTitle',
        descKey: 'landing.benefitPrivacyDesc'
    },
    {
        icon: Zap,
        titleKey: 'landing.benefitResultsTitle',
        descKey: 'landing.benefitResultsDesc'
    },
];

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown } = useSubscription();
    const { t, isRTL } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const staggerChildren = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const getPendingVerificationEmail = () => {
        try {
            return localStorage.getItem('rentguard_pending_verification') || '';
        } catch {
            return '';
        }
    };

    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Scroll refs
    const carouselRef = useRef(null);
    const contractsRef = useRef(null);
    const featureRef = useRef(null);
    const carouselInView = useInView(carouselRef, { once: true, margin: '-80px' });
    const contractsInView = useInView(contractsRef, { once: true, margin: '-80px' });
    const featureInView = useInView(featureRef, { once: true, margin: '-80px' });

    // Navigation and helpers
    const toggleAuth = (type) => {
        setAuthModal(authModal === type ? null : type);
    };

    // Open auth modal if `?auth=login|register` is present (used by global nav and external links)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const auth = params.get('auth');
        if (auth === 'login' || auth === 'register' || auth === 'confirm') {
            setTimeout(() => {
                setAuthModal(auth);
                navigate(location.pathname, { replace: true });
            }, 0);
        }
    }, [location.search, location.pathname, navigate]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + benefits.length) % benefits.length);
    const CurrentBenefitIcon = benefits[currentSlide].icon;

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % benefits.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isPaused]);

    if (isAuthenticated) {
        localStorage.removeItem('rentguard_pending_verification');
        if (isSubscriptionLoading || !isEntitlementKnown) {
            return null;
        }
        return <Navigate to={hasSubscription ? '/dashboard' : '/pricing'} replace />;
    }

    return (
        <div className="landing-real" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ===== NAVBAR (use shared Navigation component) ===== */}
            <Navigation className="nav-landing" showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

            <AuthModal
                view={authModal}
                onChangeView={setAuthModal}
                onClose={() => setAuthModal(null)}
            />

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
                            {t('landing.heroSubtitleLine')}
                        </span>
                    </motion.h1>
                    <motion.p variants={fadeInUp} className="hero-desc">
                        {t('landing.heroDescription')}
                    </motion.p>
                    <motion.div variants={fadeInUp} className="hero-cta">
                        <button className="landing-cta-btn landing-cta-btn-large" onClick={() => toggleAuth('register')}>
                            {t('landing.startFreeAnalysis')}
                        </button>
                        <span className="cta-note highlight">
                            {t('landing.noCreditCardRequired')}
                        </span>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, y: 40, rotateY: -5 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <DashboardMockup onUploadClick={() => setShowRegisterPrompt(true)} />
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
                        aria-label={t('landing.carouselPrevious')}
                    >
                        ‹
                    </button>
                    <div className="carousel-content" key={currentSlide}>
                        <div className="carousel-icon"><CurrentBenefitIcon size={34} strokeWidth={1.9} /></div>
                        <h4>{t(benefits[currentSlide].titleKey)}</h4>
                        <p>{t(benefits[currentSlide].descKey)}</p>
                    </div>
                    <button
                        className="carousel-arrow"
                        onClick={nextSlide}
                        aria-label={t('landing.carouselNext')}
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

            <div className="lp-wave-separator wave-contracts" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path
                        d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            {/* ===== LIVE DEMO PREVIEW ===== */}
            <section className="lr-contracts" ref={contractsRef}>
                <motion.div
                    className="section-header"
                    initial="hidden"
                    animate={contractsInView ? 'visible' : 'hidden'}
                    variants={fadeInUp}
                >
                    <h2>{t('landing.liveDemoTitle')}</h2>
                    <p>{t('landing.liveDemoSubtitle')}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={contractsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <ContractsGridMockup onViewClick={() => setShowRegisterPrompt(true)} />
                </motion.div>
            </section>

            <div className="lp-wave-separator wave-feature" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path
                        d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            {/* ===== FEATURE: CONTRACT VIEWER ===== */}
            <section className="lr-feature" ref={featureRef}>
                <motion.div
                    className="feature-visual"
                    initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
                    animate={featureInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    <ContractViewerMockup onScoreClick={() => setShowRegisterPrompt(true)} />
                </motion.div>

                <motion.div
                    className="feature-text"
                    initial="hidden"
                    animate={featureInView ? 'visible' : 'hidden'}
                    variants={staggerChildren}
                >
                    <motion.h2 variants={fadeInUp}>
                        {t('landing.clausesTitle')}
                    </motion.h2>
                    <motion.p variants={fadeInUp}>
                        {t('landing.clausesDescription')}
                    </motion.p>
                    <motion.ul variants={fadeInUp} className="feature-list">
                        <li>
                            <CheckCircle size={18} />
                            {t('landing.clausesFeatureLaw')}
                        </li>
                        <li>
                            <CheckCircle size={18} />
                            {t('landing.clausesFeatureFixSuggestions')}
                        </li>
                        <li>
                            <CheckCircle size={18} />
                            {t('landing.clausesFeatureRiskPerCategory')}
                        </li>
                    </motion.ul>
                </motion.div>
            </section>

            {/* Registration Prompt Modal */}
            <RegisterPromptModal
                isOpen={showRegisterPrompt}
                onClose={() => setShowRegisterPrompt(false)}
                onRegister={() => {
                    setShowRegisterPrompt(false);
                    toggleAuth('register');
                }}
            />

        </div>
    );
};

export default LandingPage;
