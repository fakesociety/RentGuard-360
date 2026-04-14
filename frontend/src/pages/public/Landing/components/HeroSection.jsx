import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { DashboardMockup } from './Mockups';

const staggerChildren = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const HeroSection = ({ toggleAuth, setShowRegisterPrompt }) => {
    const { t } = useLanguage();
    
    return (
        <section className="lr-hero">
            <motion.div className="hero-text" initial="hidden" animate="visible" variants={staggerChildren}>
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

            <motion.div className="hero-visual" initial={{ opacity: 0, y: 40, rotateY: -5 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
                <DashboardMockup onUploadClick={() => setShowRegisterPrompt(true)} />
            </motion.div>
        </section>
    );
};

export default HeroSection;