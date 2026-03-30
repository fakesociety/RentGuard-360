/**
 * ============================================
 *  ScoreMethodology
 *  Expandable Score Explanation Panel
 * ============================================
 * 
 * STRUCTURE:
 * - Toggle button "How is the score calculated?"
 * - Expandable content:
 *   - Main explanation
 *   - Severity legend (High/Medium/Low)
 *   - 5 categories grid with icons
 *   - Legal source reference
 * 
 * FEATURES:
 * - Collapsible accordion design
 * 
 * ============================================
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Info,
    ChevronDown,
    BadgeDollarSign,
    House,
    FileText,
    Wrench,
    Scale,
    ScrollText
} from 'lucide-react';
import './ScoreMethodology.css';

const ScoreMethodology = () => {
    const { t, isRTL } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);
    const popupRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                containerRef.current && !containerRef.current.contains(event.target) &&
                popupRef.current && !popupRef.current.contains(event.target)
            ) {
                setIsExpanded(false);
            }
        }
        if (isExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isExpanded]);

    useEffect(() => {
        if (isExpanded && popupRef.current) {
            setTimeout(() => {
                const rect = popupRef.current.getBoundingClientRect();
                if (rect.top < 100) {
                    window.scrollBy({
                        top: rect.top - 120, 
                        behavior: 'smooth'   
                    });
                }
            }, 50);
        }
    }, [isExpanded]);

    const categories = [
        {
            key: 'financial_terms',
            icon: BadgeDollarSign,
            label: t('methodology.catFinancial'),
            desc: t('methodology.catFinancialDesc')
        },
        {
            key: 'tenant_rights',
            icon: House,
            label: t('methodology.catRights'),
            desc: t('methodology.catRightsDesc')
        },
        {
            key: 'termination_clauses',
            icon: FileText,
            label: t('methodology.catTermination'),
            desc: t('methodology.catTerminationDesc')
        },
        {
            key: 'liability_repairs',
            icon: Wrench,
            label: t('methodology.catLiability'),
            desc: t('methodology.catLiabilityDesc')
        },
        {
            key: 'legal_compliance',
            icon: Scale,
            label: t('methodology.catLegal'),
            desc: t('methodology.catLegalDesc')
        }
    ];

    return (
        <div className={`score-methodology ${isExpanded ? 'expanded' : ''}`} ref={containerRef}>
            <button
                className="methodology-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <div className="toggle-content">
                    <Info size={16} />
                    <span>{t('methodology.title')}</span>
                </div>
                <ChevronDown size={16} className={`methodology-chevron ${isExpanded ? 'rotated' : ''}`} />
            </button>

            <div className="methodology-content-wrapper" ref={popupRef}>
                <div className="methodology-content">
                    
                    {/* Main Explanation */}
                    <div className="methodology-intro">
                        <p>{t('methodology.intro1')}</p>
                        <p>{t('methodology.intro2')}</p>
                    </div>

                    {/* Severity Legend */}
                    <div className="severity-legend">
                        <div className="severity-item high">
                            <div className="severity-header">
                                <span className="severity-dot"></span>
                                <span className="severity-label">{t('methodology.high')}</span>
                            </div>
                            <span className="severity-points">8-10 {t('methodology.pts')}</span>
                        </div>
                        <div className="severity-item medium">
                            <div className="severity-header">
                                <span className="severity-dot"></span>
                                <span className="severity-label">{t('methodology.medium')}</span>
                            </div>
                            <span className="severity-points">4-6 {t('methodology.pts')}</span>
                        </div>
                        <div className="severity-item low">
                            <div className="severity-header">
                                <span className="severity-dot"></span>
                                <span className="severity-label">{t('methodology.low')}</span>
                            </div>
                            <span className="severity-points">2-3 {t('methodology.pts')}</span>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="categories-header">
                        <h4>{t('methodology.categoriesHeader')}</h4>
                    </div>

                    <div className="categories-grid">
                        {categories.map((cat) => (
                            <div key={cat.key} className={`category-item category-${cat.key}`}>
                                <span className={`category-icon icon-${cat.key}`} aria-hidden="true">
                                    <cat.icon size={18} strokeWidth={2} />
                                </span>
                                <div className="category-info">
                                    <span className="category-label">{cat.label}</span>
                                    <span className="category-desc">{cat.desc}</span>
                                </div>
                                <span className="category-points">20</span>
                            </div>
                        ))}
                    </div>

                    {/* Legal Source */}
                    <div className="legal-source">
                        <span className="source-icon" aria-hidden="true">
                            <ScrollText size={16} strokeWidth={2} />
                        </span>
                        <span className="source-text">{t('methodology.legalSource')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoreMethodology;