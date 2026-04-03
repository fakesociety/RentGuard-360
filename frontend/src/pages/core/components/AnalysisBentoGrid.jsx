import React from 'react';
import { 
    AlertTriangle, 
    MapPin, 
    UserRound, 
    RefreshCw, 
    FileDown, 
    ChevronDown, 
    FileText 
} from 'lucide-react';
import ActionMenu from '../../../components/ui/ActionMenu';

const AnalysisBentoGrid = ({
    activeTab,
    riskScore,
    getHealthTier,
    fetchAnalysis,
    showExportMenu,
    setShowExportMenu,
    handleExportWord,
    handleExportPdf,
    isExporting,
    issuesCount,
    analysis,
    isRTL,
    t
}) => {
    if (activeTab !== 'issues') return null;

    return (
        <div className="lf-bento-grid no-print">
            
            <div className={`lf-bento-score ${getHealthTier(riskScore)}`}>
                <div className="lf-score-bg-glow"></div>
                <div className="lf-score-header">
                    <span className="lf-score-label">{t('analysis.aggregateIntelligence')}</span>
                    <h2>{t('analysis.overallHealth')}</h2>
                </div>
                <div className="lf-score-body">
                    <span className="lf-score-big">{riskScore}</span>
                    <span className="lf-score-small">/100</span>
                </div>
                <div className="lf-score-footer">
                    <div className="lf-progress-track">
                        <div className="lf-progress-fill" style={{ width: `${riskScore}%` }}></div>
                    </div>
                    <p>{t('analysis.overallRiskScore')}</p>
                </div>
            </div>

            <div className="lf-bento-tiles">
                
                <div className="lf-tile lf-tile-glass lf-quick-actions-tile">
                    <h3>{t('analysis.quickActions')}</h3>
                    <div className="lf-quick-actions-grid">
                        <button className="lf-action-btn" onClick={fetchAnalysis}>
                            <RefreshCw size={16} />
                            <span>{t('analysis.refresh')}</span>
                        </button>
                        <ActionMenu
                            isOpen={showExportMenu}
                            onToggle={() => setShowExportMenu(!showExportMenu)}
                            onClose={() => setShowExportMenu(false)}
                            containerClassName="lf-export-dropdown"
                            triggerClassName="lf-action-btn"
                            triggerContent={
                                <>
                                    <FileDown size={16} />
                                    <span>{t('analysis.export')}</span>
                                    <ChevronDown size={14} />
                                </>
                            }
                            panelClassName="lf-export-menu"
                        >
                            <div className="export-menu-group-title">{t('analysis.exportMenuDownload')}</div>
                            <button onClick={handleExportWord} disabled={isExporting}>
                                <FileText size={14} />
                                <span>{t('analysis.exportMenuWordTitle')}</span>
                            </button>
                            <button onClick={handleExportPdf} disabled={isExporting}>
                                <FileDown size={14} />
                                <span>{t('analysis.exportMenuPdfTitle')}</span>
                            </button>
                        </ActionMenu>
                    </div>
                </div>

                <div className="lf-tile lf-tile-glass">
                    <div className="lf-tile-header">
                        <AlertTriangle size={28} className="lf-tile-icon error" />
                        <span className="lf-tile-badge error">{t('analysis.actionRequired')}</span>
                    </div>
                    <h3>{t('analysis.issues')}</h3>
                    <p className="lf-tile-big-text">{issuesCount}</p>
                </div>

                <div className="lf-tile lf-tile-glass lf-tile-wide">
                    <div className="lf-tile-wide-content">
                        <h3>{t('analysis.contractMetadata')}</h3>
                        <div className="lf-meta-rows">
                            {analysis?.propertyAddress && (
                                <div className="lf-meta-row">
                                    <MapPin size={16} /> <span>{analysis.propertyAddress}</span>
                                </div>
                            )}
                            {analysis?.landlordName && (
                                <div className="lf-meta-row">
                                    <UserRound size={16} /> <span>{analysis.landlordName}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lf-tile-wide-side">
                        <p className="lf-side-label">{t('contracts.uploadDate')}</p>
                        <p className="lf-side-value">
                            {analysis?.uploadDate ? new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US') : '--'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisBentoGrid;
