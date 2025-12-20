import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { t, isRTL } = useLanguage();

    return (
        <footer className="app-footer" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-content">
                <div className="footer-brand">
                    <span className="footer-logo">🛡️</span>
                    <span className="footer-name">RentGuard 360</span>
                </div>
                <div className="footer-info">
                    <p>{t('footer.tagline')}</p>
                    <p className="footer-credits">
                        {t('footer.builtWith')}{' '}
                        <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer" className="footer-link">
                            Ron
                        </a>
                        {' & '}
                        <a href="https://github.com/MoTy" target="_blank" rel="noopener noreferrer" className="footer-link">
                            Moty
                        </a>
                    </p>
                </div>
                <div className="footer-meta">
                    <p>{t('footer.copyright').replace('{year}', currentYear)}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
