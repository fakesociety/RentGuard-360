import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ContractViewerMockup } from './Mockups';

const staggerChildren = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const FeatureSection = ({ featureRef, featureInView, isRTL, setShowRegisterPrompt }) => {
    const { t } = useLanguage();

    return (
        <section className="lr-feature" ref={featureRef}>
            <motion.div className="feature-visual" initial={{ opacity: 0, x: isRTL ? 50 : -50 }} animate={featureInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
                <ContractViewerMockup onScoreClick={() => setShowRegisterPrompt(true)} />
            </motion.div>
            <motion.div className="feature-text" initial="hidden" animate={featureInView ? 'visible' : 'hidden'} variants={staggerChildren}>
                <motion.h2 variants={fadeInUp}>{t('landing.clausesTitle')}</motion.h2>
                <motion.p variants={fadeInUp}>{t('landing.clausesDescription')}</motion.p>
                <motion.ul variants={fadeInUp} className="feature-list">
                    <li><CheckCircle size={18} />{t('landing.clausesFeatureLaw')}</li>
                    <li><CheckCircle size={18} />{t('landing.clausesFeatureFixSuggestions')}</li>
                    <li><CheckCircle size={18} />{t('landing.clausesFeatureRiskPerCategory')}</li>
                </motion.ul>
            </motion.div>
        </section>
    );
};

export default FeatureSection;