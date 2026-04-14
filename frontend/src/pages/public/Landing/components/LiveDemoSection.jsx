import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ContractsGridMockup } from './Mockups';

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const LiveDemoSection = ({ contractsRef, contractsInView, setShowRegisterPrompt }) => {
    const { t } = useLanguage();
    
    return (
        <section className="lr-contracts" ref={contractsRef}>
            <motion.div className="section-header" initial="hidden" animate={contractsInView ? 'visible' : 'hidden'} variants={fadeInUp}>
                <h2>{t('landing.liveDemoTitle')}</h2>
                <p>{t('landing.liveDemoSubtitle')}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={contractsInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }}>
                <ContractsGridMockup onViewClick={() => setShowRegisterPrompt(true)} />
            </motion.div>
        </section>
    );
};

export default LiveDemoSection;