import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import './Footer.css';

/**
 * Global App Footer Component.
 * Dynamically adjusts navigation links based on user authentication and admin status.
 * Handles RTL/LTR layout directions and dark/light theme switching contextually.
 */
const Footer = () => {
    const { t, isRTL } = useLanguage();
    const { theme } = useTheme();
    const { isAuthenticated, isAdmin } = useAuth();
    
    const currentYear = new Date().getFullYear();

    return (
        <footer className={`app-footer ${theme}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-container">
                <div className="footer-main">
                    
                    <div className="footer-brand">
                        <span className="footer-logo">RentGuard 360</span>
                        <p className="footer-desc">{t('footer.legalTagline')}</p>
                    </div>

                    <div className="footer-nav">
                        {/* Display minimal contact info for unauthenticated users (Guests) */}
                        {!isAuthenticated ? (
                            <div className="footer-col">
                                <h4 className="footer-col-title">{t('footer.contactSectionTitle')}</h4>
                                <Link to="/contact" className="footer-link">{t('nav.contact')}</Link>
                            </div>
                        ) : (
                            /* Display full navigation dashboard for logged-in users */
                            <>
                                <div className="footer-col">
                                    <h4 className="footer-col-title">{t('footer.quickLinksTitle')}</h4>
                                    <Link to="/" className="footer-link">{t('nav.home')}</Link>
                                    {/* Hide pricing link from Admins as they don't need subscriptions */}
                                    {!isAdmin && <Link to="/pricing" className="footer-link">{t('nav.pricing')}</Link>}
                                    <Link to="/contact" className="footer-link">{t('nav.contact')}</Link>
                                </div>
                                <div className="footer-col">
                                    <h4 className="footer-col-title">{t('footer.personalAreaTitle')}</h4>
                                    <Link to="/dashboard" className="footer-link">{t('nav.dashboard')}</Link>
                                    <Link to="/contracts" className="footer-link">{t('nav.contracts')}</Link>
                                    <Link to="/upload" className="footer-link">{t('nav.upload')}</Link>
                                    <Link to="/settings" className="footer-link">{t('nav.settings')}</Link>
                                </div>
                            </>
                        )}
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer.legalSectionTitle')}</h4>
                            <Link to="/terms" className="footer-link">{t('footer.termsLink')}</Link>
                            <Link to="/privacy" className="footer-link">{t('footer.privacyLink')}</Link>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-credits">
                        <span className="footer-built-by">{t('footer.builtBy')}</span>
                        <div className="footer-creators">
                            <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
                            <span>,</span>
                            <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty</a>
                            <span>{t('footer.andSeparator')}</span>
                            <a href="https://github.com/idan0508" target="_blank" rel="noopener noreferrer">Idan</a>
                        </div>
                        <a href="https://github.com/RonPiece/RentGuard-360" target="_blank" rel="noopener noreferrer" className="footer-github-link" aria-label="GitHub Repository">
                            <Github size={18} className="footer-github-icon" />
                        </a>
                    </div>
                    
                    <div className="footer-copy">
                        &copy; {currentYear} RentGuard 360.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
