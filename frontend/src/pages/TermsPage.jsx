/**
 * ============================================
 *  TermsPage
 *  Terms of Service & Privacy Policy
 * ============================================
 */
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Calendar } from 'lucide-react';
import './TermsPage.css';

const TermsPage = () => {
    const { t, isRTL } = useLanguage();

    const sections = [
        {
            id: 'acceptance',
            titleKey: 'terms.s1Title',
            contentKey: 'terms.s1Content',
        },
        {
            id: 'service',
            titleKey: 'terms.s2Title',
            contentKey: 'terms.s2Content',
            listKeys: ['terms.s2List1', 'terms.s2List2', 'terms.s2List3', 'terms.s2List4', 'terms.s2List5'],
        },
        {
            id: 'purchases',
            titleKey: 'terms.s3Title',
            contentKey: 'terms.s3Content',
        },
        {
            id: 'refund',
            titleKey: 'terms.s4Title',
            contentKey: 'terms.s4Content',
        },
        {
            id: 'data',
            titleKey: 'terms.s5Title',
            contentKey: 'terms.s5Content',
            listKeys: ['terms.s5List1', 'terms.s5List2', 'terms.s5List3', 'terms.s5List4', 'terms.s5List5'],
        },
        {
            id: 'security',
            titleKey: 'terms.s6Title',
            contentKey: 'terms.s6Content',
        },
        {
            id: 'disclaimer',
            titleKey: 'terms.s7Title',
            contentKey: 'terms.s7Content',
        },
        {
            id: 'ip',
            titleKey: 'terms.s8Title',
            contentKey: 'terms.s8Content',
        },
        {
            id: 'changes',
            titleKey: 'terms.s9Title',
            contentKey: 'terms.s9Content',
        },
        {
            id: 'contact',
            titleKey: 'terms.s10Title',
            contentKey: 'terms.s10Content',
        },
    ];

    return (
        <div className="terms-container" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="terms-header">
                <h1>{t('terms.pageTitle')}</h1>
                <span className="terms-updated">
                    <Calendar size={14} />
                    {t('terms.lastUpdated')}
                </span>
            </div>

            {/* Table of Contents */}
            <nav className="terms-toc">
                <h3>{t('terms.toc')}</h3>
                <ol className="terms-toc-list">
                    {sections.map((section, idx) => (
                        <li key={section.id}>
                            <a href={`#${section.id}`}>
                                <span className="toc-number">{idx + 1}</span>
                                {t(section.titleKey)}
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            {/* Sections */}
            <div className="terms-sections">
                {sections.map((section, idx) => (
                    <section key={section.id} id={section.id} className="terms-section">
                        <div className="section-header">
                            <span className="section-number">{idx + 1}</span>
                            <h2>{t(section.titleKey)}</h2>
                        </div>
                        <p>{t(section.contentKey)}</p>
                        {section.listKeys && (
                            <ul>
                                {section.listKeys.map((key, i) => (
                                    <li key={i}>{t(key)}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>

            {/* Contact Footer */}
            <div className="terms-contact-bar">
                <p>
                    {t('terms.contactFooter')}{' '}
                    <a href="/contact">{t('terms.contactPage')}</a>{' '}
                    {t('terms.contactOr')}{' '}
                    <a href="mailto:support@rentguard360.com">support@rentguard360.com</a>
                </p>
            </div>
        </div>
    );
};

export default TermsPage;
