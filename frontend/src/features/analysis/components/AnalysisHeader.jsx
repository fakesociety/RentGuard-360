/**
 * ============================================
 *  AnalysisHeader Component
 *  Page header for contract analysis
 * ============================================
 * 
 * STRUCTURE:
 * - Title and Breadcrumbs
 * - High-level metrics
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import BackButton from '@/components/ui/BackButton';
import './AnalysisHeader.css';

const AnalysisHeader = ({
    analysis,
    result,
    activeTab,
    setActiveTab,
    issuesCount,
    t,
    isRTL
}) => {
    return (
        <header className="lf-header no-print">
            <div className="lf-header-content">
                <div className="lf-header-text">
                    <span className="lf-pre-title">{t('analysis.title')}</span>
                    <h1 className="lf-main-title">{analysis?.fileName || t('analysis.contractDocument')}</h1>
                    <p className="lf-subtitle">{result?.summary || t('analysis.analysisComplete')}</p>
                </div>
                <div className="lf-header-actions">
                    <BackButton to="/contracts" label={t('analysis.backToContracts')} />
                </div>
            </div>

            <div className="lf-tabs-container">
                <div className="lf-tabs-pill">
                    <button 
                        className={`lf-tab-btn ${activeTab === 'issues' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('issues')}
                    >
                        {t('analysis.issues')} ({issuesCount})
                    </button>
                    <button 
                        className={`lf-tab-btn ${activeTab === 'contract' ? 'active' : ''}`} 
                        onClick={() => setActiveTab('contract')}
                    >
                        {t('analysis.fullContractTab')}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default AnalysisHeader;
