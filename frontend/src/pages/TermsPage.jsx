/**
 * ============================================
 * TermsPage
 * Terms of Service & Privacy Policy
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Calendar,
    ChevronDown,
    Info,
    Gavel,
    CreditCard,
    Shield,
    AlertTriangle,
    XCircle,
    Mail
} from 'lucide-react';
import './LegalPages.css';

// פונקציית עזר שמתאימה אייקון מודרני לפי המספר הסידורי של הסעיף
const getIconForIndex = (index) => {
    const icons = [Info, Gavel, CreditCard, Shield, AlertTriangle, XCircle];
    const IconComponent = icons[index % icons.length];
    return <IconComponent size={20} strokeWidth={2.5} />;
};

const TermsPage = () => {
    const { translations, isRTL } = useLanguage();
    const { title, updated, tocTitle, sections, contactPrefix, contactLinkText, contactMiddle } = translations.terms;

    // גלילה חלקה למעלה
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // ניהול מצב האקורדיון - שומר את ה-ID של הסעיף הפתוח (ברירת מחדל: הראשון פתוח)
    const [activeSection, setActiveSection] = useState(sections[0]?.id || null);

    // פונקציית הפתיחה והגלילה
    const handleToggle = (id) => {
        setActiveSection(prev => prev === id ? null : id);

        // גלילה חלקה לסעיף שנפתח
        if (activeSection !== id) {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        }
    };

    return (
        <div className="terms-page-wrapper mesh-gradient" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* 1. הכותרת צריכה להיות מחוץ לגריד של שתי העמודות, כדי לתפוס 100% רוחב! */}
            <header className="terms-global-header">
                <div className="terms-header-content">
                    <h1 className="terms-main-title">{title}</h1>
                    <div className="terms-meta">
                        <span className="meta-updated">
                            <Calendar size={16} /> {updated}
                        </span>
                        <span className="meta-dot"></span>
                        <span className="meta-badge">מסמך משפטי</span>
                    </div>
                </div>
            </header>

            {/* 2. המכולה המרכזית המחלקת את המסך לשתי עמודות */}
            <div className="terms-layout">

                {/* Sidebar (TOC) */}
                <aside className="terms-sidebar">
                    <div className="sidebar-card">
                        <div className="sidebar-header">
                            <h2>{tocTitle}</h2>
                            <p>ניווט מהיר בסעיפים</p>
                        </div>
                        <nav className="toc-nav">
                            {sections.map((section, idx) => {
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={`toc-${section.id}`}
                                        className={`toc-btn ${isActive ? 'active' : ''}`}
                                        onClick={() => handleToggle(section.id)}
                                    >
                                        <span className="toc-icon">{getIconForIndex(idx)}</span>
                                        <span className="toc-text">
                                            {idx + 1}. {section.title.replace(/^\d+\.\s*/, '')}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="terms-main-content">

                    {/* 3. העטיפה הלבנה הענקית (Paper) שכל האקורדיונים צריכים להיות בתוכה! */}
                    <div className="content-paper">
                        <div className="terms-accordions">
                            {sections.map((section, idx) => {
                                const isActive = activeSection === section.id;
                                return (
                                    <div key={section.id} id={section.id} className={`accordion-card ${isActive ? 'active' : ''}`}>
                                        <button className="accordion-trigger" onClick={() => handleToggle(section.id)}>
                                            <div className="accordion-trigger-left">
                                                <div className="accordion-icon-box">
                                                    {getIconForIndex(idx)}
                                                </div>
                                                <h2 className="accordion-title">
                                                    {idx + 1}. {section.title.replace(/^\d+\.\s*/, '')}
                                                </h2>
                                            </div>
                                            <ChevronDown className={`chevron ${isActive ? 'rotated' : ''}`} />
                                        </button>

                                        <div className="accordion-body">
                                            <div className="accordion-content-inner">
                                                <p className="section-content-text">{section.content}</p>

                                                {section.list && (
                                                    <ul className="terms-list">
                                                        {section.list.map((item, i) => (
                                                            <li key={i}>
                                                                <span className="list-check">✓</span>
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div> {/* End of content-paper */}

                    {/* Contact Help Card */}
                    <div className="terms-help-card">
                        <div className="help-card-inner">
                            <div className="help-text">
                                <h2>{contactPrefix}</h2>
                                <p>{contactMiddle}</p>
                            </div>
                            <div className="help-actions">
                                <Link to="/contact" className="help-btn">
                                    <Mail size={18} />
                                    {contactLinkText}
                                </Link>
                                <span className="help-email">rentguard360@gmail.com</span>
                            </div>
                        </div>
                        {/* Decorative Circles */}
                        <div className="circle-decoration decoration-1"></div>
                        <div className="circle-decoration decoration-2"></div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default TermsPage;