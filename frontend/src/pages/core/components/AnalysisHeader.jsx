import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';

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
                    <Link to="/contracts" className="lf-btn-back">
                        {isRTL ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                        {t('analysis.backToContracts')}
                    </Link>
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
