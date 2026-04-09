/**
 * ============================================
 *  AnalysisBentoGrid Component
 *  Dashboard-style overview of contract details
 * ============================================
 * 
 * STRUCTURE:
 * - Risk score gauge
 * - Key insights and party info
 * 
 * DEPENDENCIES:
 * - components/domain/ScoreBreakdown
 * ============================================
 */
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
import ActionMenu from '@/components/ui/ActionMenu';
import MapComponent from '@/components/ui/MapComponent';
import './AnalysisBentoGrid.css';

const AnalysisBentoGrid = ({
    activeTab,
    riskScore,
    getHealthTier,
    fetchAnalysis,
    showExportMenu,
    setShowExportMenu,
    handleExportWord,
    handleExportContractWord,
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
                    <svg className="lf-score-ring" viewBox="0 0 120 120">
                        <circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth="8"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r="54"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.9)"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 54}
                            strokeDashoffset={2 * Math.PI * 54 - (riskScore / 100) * (2 * Math.PI * 54)}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <div className="lf-score-text">
                        <span className="lf-score-big">{riskScore}</span>
                        <span className="lf-score-small">/100</span>
                    </div>
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
                            <button onClick={handleExportWord} disabled={isExporting}><FileText size={14}/><span>{t('analysis.exportMenuWordTitle')}</span></button>
                            <button onClick={handleExportContractWord} disabled={isExporting}><FileText size={14} /><span>{t('analysis.exportMenuFullContractWordTitle')}</span></button>
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

                <div className="lf-tile lf-tile-glass lf-tile-wide" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flex: 1 }}>
                        <div className="lf-tile-wide-content" style={{ flex: 1 }}>
                            <h3>{t('analysis.contractMetadata')}</h3>
                            <div className="lf-meta-rows">
                                {analysis?.propertyAddress && (
                                    <div className="lf-meta-row" style={{ marginBottom: '10px' }}>
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
                        <div style={{ flex: 1, minWidth: '200px', height: '100%', minHeight: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                            <MapComponent 
                                address={analysis?.propertyAddress || ''} 
                                popupText={analysis?.propertyAddress || 'הכתובת שסופקה'}
                                height="100%"
                            />
                        </div>
                        <div className="lf-tile-wide-side" style={{ minWidth: '100px' }}>
                            <p className="lf-side-label">{t('contracts.uploadDate')}</p>
                            <p className="lf-side-value">
                                {analysis?.uploadDate ? new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US') : '--'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisBentoGrid;
