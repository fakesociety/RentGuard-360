/**
 * ============================================
 * PrivacyPage
 * Privacy Policy (Modern Design)
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import BackButton from '../../components/ui/BackButton';
import {
    Calendar,
    ChevronDown,
    Info,
    ShieldCheck,
    Database,
    Share2,
    Cpu,
    Lock,
    Cookie,
    UserCheck,
    Mail
} from 'lucide-react';
import './LegalPages.css';

const getIconForIndex = (index) => {
    const icons = [Info, ShieldCheck, Database, Share2, Cpu, Lock, Cookie, UserCheck];
    const IconComponent = icons[index % icons.length];
    return <IconComponent size={20} strokeWidth={2.5} />;
};

const PrivacyPage = () => {
    const { translations, isRTL, t } = useLanguage();
    const { title, updated, tocTitle, sections, contactPrefix, contactLinkText, contactMiddle } = translations.privacy;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [activeSection, setActiveSection] = useState(sections[0]?.id || null);

    const handleToggle = (id) => {
        setActiveSection(prev => prev === id ? null : id);

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
            
            {/* ---------------- Global Header (Spans Full Width) ---------------- */}
            {/* Keep the header outside the two-column layout so it spans full width */}
            <header className="terms-global-header">
                <div className="terms-header-container">
                    <div className="terms-header-content">
                        <h1 className="terms-main-title">{title}</h1>
                        <div className="terms-meta">
                            <span className="meta-updated">
                                <Calendar size={16} /> {updated}
                            </span>
                            <span className="meta-dot"></span>
                            <span className="meta-badge">{t('legal.legalDocument')}</span>
                        </div>
                    </div>
                    <BackButton />
                </div>
            </header>

            {/* ---------------- Two-Column Layout ---------------- */}
            <div className="terms-layout">

                {/* Sidebar (TOC) */}
                <aside className="terms-sidebar">
                    <div className="sidebar-card">
                        <div className="sidebar-header">
                            <h2>{tocTitle}</h2>
                            <p>{t('legal.quickNavigation')}</p>
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

                {/* Main Content */}
                <main className="terms-main-content">

                    {/* Unified Background Container for all sections */}
                    {/* Wrap all content in one large white "paper" container */}
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
                    </div>

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

export default PrivacyPage;