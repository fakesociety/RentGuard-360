/**
 * ============================================
 *  AnalysisSidebar Component
 *  Sidebar navigation for the analysis view
 * ============================================
 * 
 * STRUCTURE:
 * - Score methodology toggle
 * - Issues summary
 * 
 * DEPENDENCIES:
 * - components/domain/ScoreMethodology
 * ============================================
 */
import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';
import ScoreBreakdown from '@/features/analysis/components/ScoreBreakdown';
import ScoreMethodology from '@/features/analysis/components/ScoreMethodology';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './AnalysisSidebar.css';

const AnalysisSidebar = ({
    activeTab,
    isContractDocument,
    riskScore,
    scoreBreakdown,
    issues,
    ShareComponent
}) => {
    const { t, isRTL } = useLanguage();
    const [isOcrAccordionOpen, setIsOcrAccordionOpen] = useState(false);
    const showOcrAccordion = activeTab === 'contract' && isContractDocument;

    return (
        <aside className="lf-sidebar-column no-print">
            {showOcrAccordion && (
                <div className={`lf-share-accordion lf-ocr-accordion ${isOcrAccordionOpen ? 'expanded' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <button
                        className="methodology-toggle lf-ocr-accordion-trigger"
                        onClick={() => setIsOcrAccordionOpen(!isOcrAccordionOpen)}
                        aria-expanded={isOcrAccordionOpen}
                    >
                        <div className="toggle-content lf-ocr-accordion-title">
                            <Info size={16} />
                            <span>{t('contractView.ocrDisclaimerTitle')}</span>
                        </div>
                        <ChevronDown size={16} className={`methodology-chevron ${isOcrAccordionOpen ? 'rotated' : ''}`} />
                    </button>

                    <div className="methodology-content-wrapper lf-ocr-accordion-content">
                        <div className="methodology-content lf-ocr-accordion-inner">
                            <p>{t('contractView.ocrDisclaimerBody1')}</p>
                            <p>{t('contractView.ocrDisclaimerBody2')}</p>
                        </div>
                    </div>
                </div>
            )}

            {ShareComponent}

            {/* Existing Score Breakdown & Methodology */}
            <div className="lf-existing-components">

                <ScoreBreakdown overallScore={riskScore} breakdown={scoreBreakdown} issues={issues} />
                <ScoreMethodology alwaysOpen={true} /> 
            </div>

        </aside>
    );
};

export default AnalysisSidebar;
