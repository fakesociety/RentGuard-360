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
import Accordion from '@/components/ui/Accordion';
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
                <Accordion
                    className="lf-ocr-accordion"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    title={t('contractView.ocrDisclaimerTitle')}
                    icon={<Info size={16} />}
                >
                    <div className="lf-ocr-accordion-inner">
                        <p>{t('contractView.ocrDisclaimerBody1')}</p>
                        <p>{t('contractView.ocrDisclaimerBody2')}</p>
                    </div>
                </Accordion>
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
