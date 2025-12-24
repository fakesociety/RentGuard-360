import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Shield } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { isRTL } = useLanguage();
    const { isDark } = useTheme();

    return (
        <footer className={`app-footer ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-container">
                <div className="footer-content">

                    {/* Logo */}
                    <div className="footer-brand">
                        <Shield size={22} className="footer-shield" />
                        <span className="footer-name">RentGuard 360</span>
                    </div>

                    {/* Credits */}
                    <div className="footer-credits">
                        <span>{isRTL ? 'נבנה ע"י' : 'Built by'}</span>
                        <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
                        <span>&</span>
                        <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty</a>
                        <span className="footer-divider">|</span>
                        <span>{isRTL ? 'פרויקט גמר מחשוב ענן' : 'Cloud Computing Final Project'}</span>
                    </div>
                </div>

                {/* Copyright */}
                <p className="footer-copyright">
                    © {currentYear} RentGuard 360
                </p>
            </div>
        </footer>
    );
};

export default Footer;
