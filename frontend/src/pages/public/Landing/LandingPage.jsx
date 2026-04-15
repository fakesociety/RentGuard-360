/** Landing page - assembles Hero, Features, Benefits, LiveDemo, and Pricing sections for public visitors. */
import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useInView } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import Navigation from '@/components/layout/Navigation/Navigation';
import AuthModal from '@/features/auth/components/AuthModal';
import RegisterPromptModal from '@/features/auth/components/RegisterPromptModal';

import HeroSection from './components/HeroSection.jsx';
import BenefitsCarousel from './components/BenefitsCarousel.jsx';
import LiveDemoSection from './components/LiveDemoSection.jsx';
import FeatureSection from './components/FeatureSection.jsx';
import './LandingPage.css';

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown } = useSubscription();
    const { isRTL } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    const getPendingVerificationEmail = () => {
        try {
            return localStorage.getItem('rentguard_pending_verification') || '';
        } catch {
            return '';
        }
    };

    const [authModal, setAuthModal] = useState(() => (getPendingVerificationEmail() ? 'confirm' : null));
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

    const carouselRef = useRef(null);
    const contractsRef = useRef(null);
    const featureRef = useRef(null);
    const carouselInView = useInView(carouselRef, { once: true, margin: '-80px' });
    const contractsInView = useInView(contractsRef, { once: true, margin: '-80px' });
    const featureInView = useInView(featureRef, { once: true, margin: '-80px' });

    const toggleAuth = (type) => {
        setAuthModal(authModal === type ? null : type);
    };

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

    if (isAuthenticated) {
        localStorage.removeItem('rentguard_pending_verification');
        if (isSubscriptionLoading || !isEntitlementKnown) {
            return null;
        }
        return <Navigate to={hasSubscription ? '/dashboard' : '/pricing'} replace />;
    }

    return (
        <div className="landing-real" dir={isRTL ? 'rtl' : 'ltr'}>
            <Navigation className="nav-landing" showAuthControls={!isAuthenticated} onAuthClick={toggleAuth} />

            <AuthModal
                view={authModal}
                onChangeView={setAuthModal}
                onClose={() => setAuthModal(null)}
            />

            <HeroSection toggleAuth={toggleAuth} setShowRegisterPrompt={setShowRegisterPrompt} />

            <BenefitsCarousel carouselRef={carouselRef} carouselInView={carouselInView} />

            <div className="lp-wave-separator wave-contracts" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path
                        d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            <LiveDemoSection contractsRef={contractsRef} contractsInView={contractsInView} setShowRegisterPrompt={setShowRegisterPrompt} />

            <div className="lp-wave-separator wave-feature" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path
                        d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            <FeatureSection featureRef={featureRef} featureInView={featureInView} isRTL={isRTL} setShowRegisterPrompt={setShowRegisterPrompt} />

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
