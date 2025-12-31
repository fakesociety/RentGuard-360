import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, Mail, Clock } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { isRTL } = useLanguage();
    const { isDark } = useTheme();

    return (
        <footer className={`app-footer ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-container">
                <div className="footer-row">

                    {/* Brand Column */}
                    <div className="footer-col col-brand">
                        <Shield size={22} className="footer-shield" />
                        <span className="footer-name">RentGuard 360</span>
                    </div>

                    {/* Features Column */}
                    <div className="footer-col col-features">
                        <div className="features-row">
                            <span>{isRTL ? 'פרויקט גמר מחשוב ענן' : 'Cloud Computing Final Project'}</span>
                        </div>
                    </div>

                    {/* Contact Column */}
                    <div className="footer-col col-contact">
                        <div className="contact-inner">
                            <div className="contact-row">
                                <Mail size={14} />
                                <a href="mailto:projForruppin@gmail.com">projForruppin@gmail.com</a>
                            </div>
                            <div className="contact-row">
                                <Clock size={14} />
                                <span>{isRTL ? 'תגובה עד 24 שעות' : 'Response within 24h'}</span>
                            </div>
                            <div className="credits-row">
                                {isRTL ? 'נבנה ע"י' : 'Built by'}{' '}
                                <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
                                {' & '}
                                <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copyright Row */}
                <div className="footer-copyright">
                    © 2025 RentGuard 360 | AI-Lawyers Team
                </div>
            </div>
        </footer>
    );
};

export default Footer;
