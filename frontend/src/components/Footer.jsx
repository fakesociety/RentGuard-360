/**
 * ============================================
 *  Footer
 *  Application Footer with Features & Credits
 * ============================================
 * 
 * STRUCTURE:
 * - Brand column (logo, tagline)
 * - Features column (AWS, encryption, AI, privacy)
 * - Credits column (contact, project info)
 * 
 * FEATURES:
 * - Responsive 3-column layout
 * - Theme-aware styling
 * - Bilingual content (Hebrew/English)
 * ============================================
 */
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import './Footer.css';

const Footer = () => {
    const { isRTL } = useLanguage();
    const { theme } = useTheme();

    return (
        <footer className={`app-footer ${theme}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="footer-container">
                <div className="footer-flex-row">

                    {/* Left/Right Brand Column */}
                    <div className="footer-brand-col">
                        <span className="footer-brand-name">RentGuard 360</span>
                        <p className="footer-tagline">
                            {isRTL ? 'הגנה משפטית חכמה לכל חוזה שכירות.' : 'Smart legal protection for every rental agreement.'}
                        </p>
                    </div>

                    {/* Center Links Column */}
                    <div className="footer-links-col">
                        <Link to="/terms" className="footer-link">
                            {isRTL ? 'תנאי שימוש' : 'Terms of Service'}
                        </Link>
                        <Link to="/privacy" className="footer-link">
                            {isRTL ? 'מדיניות פרטיות' : 'Privacy Policy'}
                        </Link>
                        <Link to="/contact" className="footer-link">
                            {isRTL ? 'צור קשר' : 'Contact Us'}
                        </Link>
                    </div>

                </div>

                {/* Bottom Copyright & Credits Row */}
                <div className="footer-copyright">
                    {isRTL ? (
                        <p className="footer-credit-line footer-credit-line-rtl">
                            <span className="footer-credit-rtl-label">נבנה ע"י</span>
                            <span className="footer-credit-names" dir="ltr">
                                <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron <Github size={12} className="footer-github-icon" /></a>
                                <span>, </span>
                                <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty <Github size={12} className="footer-github-icon" /></a>
                                <span> &amp; </span>
                                <a href="https://github.com/idan0508" target="_blank" rel="noopener noreferrer">Idan <Github size={12} className="footer-github-icon" /></a>
                            </span>
                            <span className="footer-credit-separator" aria-hidden="true">|</span>
                            <span className="footer-credit-copy" dir="ltr">© 2026 RentGuard 360</span>
                        </p>
                    ) : (
                        <p className="footer-credit-line footer-credit-line-ltr">
                            <span className="footer-credit-ltr-label">Built by</span>
                            <span className="footer-credit-names" dir="ltr">
                                <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron <Github size={12} className="footer-github-icon" /></a>
                                <span>, </span>
                                <a href="https://github.com/fakesociety" target="_blank" rel="noopener noreferrer">Moty <Github size={12} className="footer-github-icon" /></a>
                                <span> &amp; </span>
                                <a href="https://github.com/idan0508" target="_blank" rel="noopener noreferrer">Idan <Github size={12} className="footer-github-icon" /></a>
                            </span>
                            <span className="footer-credit-separator" aria-hidden="true">|</span>
                            <span className="footer-credit-copy" dir="ltr">© 2026 RentGuard 360</span>
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
};

export default Footer;