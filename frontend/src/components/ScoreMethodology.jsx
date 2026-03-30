import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Info, ChevronDown, BadgeDollarSign, House, FileText, Wrench, Scale, ScrollText } from 'lucide-react';
import './SidebarAccordions.css';

const ScoreMethodology = () => {
    const { t, isRTL } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false); // סגור כברירת מחדל

    const categories = [
        { key: 'financial_terms', icon: BadgeDollarSign, label: t('methodology.catFinancial'), desc: t('methodology.catFinancialDesc') },
        { key: 'tenant_rights', icon: House, label: t('methodology.catRights'), desc: t('methodology.catRightsDesc') },
        { key: 'termination_clauses', icon: FileText, label: t('methodology.catTermination'), desc: t('methodology.catTerminationDesc') },
        { key: 'liability_repairs', icon: Wrench, label: t('methodology.catLiability'), desc: t('methodology.catLiabilityDesc') },
        { key: 'legal_compliance', icon: Scale, label: t('methodology.catLegal'), desc: t('methodology.catLegalDesc') }
    ];

    return (
        <div className={`score-methodology ${isExpanded ? 'expanded' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <button className="methodology-toggle" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="toggle-content">
                    <Info size={18} />
                    <span>{t('methodology.title', 'איך מחושב הציון?')}</span>
                </div>
                <ChevronDown size={18} className="methodology-chevron" />
            </button>

            <div className="methodology-content-wrapper">
                <div className="methodology-content">
                    <div className="methodology-intro">
                        <p>{t('methodology.intro1')}</p>
                        <p>{t('methodology.intro2')}</p>
                    </div>

                    <div className="severity-legend">
                        <div className="severity-item high">
                            <div className="severity-header"><span className="severity-dot"></span><span className="severity-label">{t('methodology.high')}</span></div>
                            <span className="severity-points">8-10 {t('methodology.pts')}</span>
                        </div>
                        <div className="severity-item medium">
                            <div className="severity-header"><span className="severity-dot"></span><span className="severity-label">{t('methodology.medium')}</span></div>
                            <span className="severity-points">4-6 {t('methodology.pts')}</span>
                        </div>
                        <div className="severity-item low">
                            <div className="severity-header"><span className="severity-dot"></span><span className="severity-label">{t('methodology.low')}</span></div>
                            <span className="severity-points">2-3 {t('methodology.pts')}</span>
                        </div>
                    </div>

                    <div className="categories-header">
                        <h4>{t('methodology.categoriesHeader')}</h4>
                    </div>

                    <div className="categories-grid">
                        {categories.map((cat) => (
                            <div key={cat.key} className={`category-item category-${cat.key}`}>
                                <span className={`category-icon icon-${cat.key}`}><cat.icon size={18} strokeWidth={2} /></span>
                                <div className="category-info">
                                    <span className="category-label">{cat.label}</span>
                                    <span className="category-desc">{cat.desc}</span>
                                </div>
                                <span className="category-points">20</span>
                            </div>
                        ))}
                    </div>

                    <div className="legal-source">
                        <span className="source-icon"><ScrollText size={16} strokeWidth={2} /></span>
                        <span className="source-text">{t('methodology.legalSource')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreMethodology;