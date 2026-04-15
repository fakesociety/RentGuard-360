/** Reusable layout for legal pages - sidebar TOC + accordion sections + contact card. */
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import BackButton from '@/components/ui/BackButton/BackButton';
import { Calendar, ChevronDown, Mail } from 'lucide-react';
import { useLegalAccordion } from './hooks/useLegalAccordion';
import '@/pages/legal/LegalPages.css';

const LegalDocumentLayout = ({ data, icons }) => {
    const { isRTL, t } = useLanguage();
    const { title, updated, tocTitle, sections, contactPrefix, contactLinkText, contactMiddle } = data;

    const { activeSection, handleToggle } = useLegalAccordion(sections[0]?.id);

    const getIconForIndex = (index) => {
        const IconComponent = icons[index % icons.length];
        return <IconComponent size={20} strokeWidth={2.5} />;
    };

    return (
        <div className="terms-page-wrapper mesh-gradient" dir={isRTL ? 'rtl' : 'ltr'}>
            
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

            <div className="terms-layout">
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

                <main className="terms-main-content">
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
                        <div className="circle-decoration decoration-1"></div>
                        <div className="circle-decoration decoration-2"></div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LegalDocumentLayout;
