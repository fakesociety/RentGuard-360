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
import { Navigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemeToggle } from '../../components/ui/Toggle';
import LanguageToggle from '../../components/ui/LanguageToggle';
import Navigation from '../../components/layout/Navigation';
import { Upload, Brain, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Shield, Download, Edit2, Trash2, X, Cloud, Bot, Lock, Zap, Pause, Wallet, House } from 'lucide-react';
import Footer from '../../components/layout/Footer';
import './LandingPage.css';

// Some eslint setups don't count JSX member expressions (e.g. <motion.div>) as a variable usage.
// This keeps the import from being flagged as unused while preserving the current Framer Motion usage.
void motion;

// ===== MAIN LANDING PAGE =====

import AuthModal from './components/AuthModal';
import { DashboardMockup, ContractsGridMockup, ContractViewerMockup } from './components/Mockups';
import RegisterPromptModal from './components/RegisterPromptModal';

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown } = useSubscription();
    const { t, isRTL } = useLanguage();

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

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + benefits.length) % benefits.length);
    const CurrentBenefitIcon = benefits[currentSlide].icon;

    return (
        <div className="landing-real" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* ===== NAVBAR (use shared Navigation component) ===== */}
            <Navigation showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

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


        </div>
    );
};

export default LandingPage;
