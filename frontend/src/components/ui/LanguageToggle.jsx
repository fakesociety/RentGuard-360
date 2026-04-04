/**
 * ============================================
 *  LanguageToggle
 *  Hebrew/English Language Switcher
 * ============================================
 * 
 * FEATURES:
 * - Two-option toggle (עב | EN)
 * - Uses LanguageContext for state
 * - Visual indicator for active language
 * 
 * ============================================
 */
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import './LanguageToggle.css';

const LanguageToggle = () => {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <button
            className="language-toggle"
            onClick={toggleLanguage}
            title={language === 'he' ? t('languageToggle.switchToEnglish') : t('languageToggle.switchToHebrew')}
        >
            <span className={`lang-option ${language === 'he' ? 'active' : ''}`}>{t('languageToggle.heLabel')}</span>
            <span className="lang-separator">|</span>
            <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>{t('languageToggle.enLabel')}</span>
        </button>
    );
};

export default LanguageToggle;
