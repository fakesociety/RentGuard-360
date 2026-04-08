import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ActionMenu from '../../../components/ui/ActionMenu';
import {
    Trash2, Pencil, Download, RefreshCw, FileText,
    MoreVertical, MapPin, Users, Calendar, AlertTriangle, Share2
} from 'lucide-react';

const DEFAULT_ANALYSIS_TIMEOUT_MS = 3 * 60 * 1000;
const ANALYSIS_TIMEOUT_MS = (() => {
    const raw = import.meta.env.VITE_ANALYSIS_TIMEOUT_MS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYSIS_TIMEOUT_MS;
})();

const isContractTimedOut = (contract) => {
    const status = (contract.status || '').toLowerCase();
    if (status === 'analyzed' || status === 'failed' || status === 'error') {
        return false;
    }
    const uploadDate = contract.uploadDate;
    if (!uploadDate) return false;

    const uploadTime = new Date(uploadDate.endsWith('Z') ? uploadDate : uploadDate + 'Z').getTime();
    const now = Date.now();
    const elapsed = now - uploadTime;

    return elapsed > ANALYSIS_TIMEOUT_MS;
};

const ContractCard = ({ contract, onDelete, onEdit, onExport, onShare, formatDate, t, isRTL }) => {
    const [activeMenu, setActiveMenu] = useState(null);
    const status = (contract.status || '').toLowerCase();

    const getScoreData = (score) => {
        if (score >= 86) return { class: 'excellent', label: t('contracts.lowRisk') };
        if (score >= 71) return { class: 'good', label: t('contracts.lowMediumRisk') };
        if (score >= 51) return { class: 'warning', label: t('contracts.mediumRisk') };
        return { class: 'danger', label: t('contracts.highRisk') };
    };

    const isTimedOut = isContractTimedOut(contract);
    const isAnalyzed = status === 'analyzed';
    const isFailed = status === 'failed' || status === 'error' || isTimedOut;
    const score = contract.riskScore ?? contract.risk_score ?? null;
    const hasScore = isAnalyzed && score !== null && score !== undefined;

    const scoreData = hasScore ? getScoreData(score) : { color: '#64748b', class: 'pending', label: '---' };

    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        if (!hasScore) return;

        let startTime;
        let rafId;

        const animate = (time) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / 1500, 1);
            // easeOutCubic matching the css transition
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            setAnimatedScore(Math.floor(easeOut * score));

            if (progress < 1) {
                rafId = requestAnimationFrame(animate);
            } else {
                setAnimatedScore(score);
            }
        };

        const timer = setTimeout(() => {
            rafId = requestAnimationFrame(animate);
        }, 50);

        return () => {
            clearTimeout(timer);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [hasScore, score]);

    // Determine Card Border & Badge Color based on status
    let cardClass = 'lf-card-pending';
    let badgeClass = 'lf-badge-pending';
    let badgeLabel = t('contracts.pendingAnalysis');

    if (isAnalyzed) {
        cardClass = `lf-card-${scoreData.class}`;
        badgeClass = `lf-badge-${scoreData.class}`;
        badgeLabel = scoreData.label;
    } else if (isFailed) {
        cardClass = 'lf-card-danger';
        badgeClass = 'lf-badge-danger';
        badgeLabel = isTimedOut ? t('contracts.statusTimedOutRetry') : t('contracts.statusAnalysisFailed');
    }

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    };

    return (
        <div 
            className={`lf-contract-card ${cardClass}`} 
            style={{ zIndex: activeMenu ? 99 : 1 }}
            onMouseMove={handleMouseMove}
        >

            <div className="lf-card-header">
                <div className="lf-card-title-group">
                    <span className={`lf-card-badge ${badgeClass}`}>
                        {!isAnalyzed && !isFailed && <RefreshCw size={12} className="lf-spin-icon" />}
                        {badgeLabel}
                    </span>
                    <h3 className="lf-card-title" onClick={(e) => onEdit(contract, e)}>
                        {contract.fileName || t('contracts.untitledContract')}
                    </h3>
                    <p className="lf-card-date">
                        <Calendar size={12} />
                        {t('contracts.uploadDate')} {formatDate(contract.uploadDate)}
                    </p>
                </div>

                {/* 3-Dots Menu for Edit/Delete/Share */}
                <div className="lf-card-menu-wrap">
                    <ActionMenu
                        isOpen={activeMenu === 'options'}
                        onToggle={() => setActiveMenu(activeMenu === 'options' ? null : 'options')}
                        onClose={() => setActiveMenu(null)}
                        triggerClassName="lf-menu-trigger"
                        triggerContent={<MoreVertical size={20} />}
                        panelClassName={`lf-dropdown-menu ${isRTL ? 'rtl' : 'ltr'}`}
                    >
                        <button className="lf-menu-item" onClick={(e) => { onEdit(contract, e); setActiveMenu(null); }}>
                            <Pencil size={16} /> <span>{t('contracts.editButtonTitle')}</span>
                        </button>
                        <button className="lf-menu-item" onClick={() => { onShare(contract); setActiveMenu(null); }} disabled={!isAnalyzed}>
                            <Share2 size={16} /> <span>{t('contracts.menuShareTrigger')}</span>
                        </button>
                        <div className="lf-menu-divider"></div>
                        <button className="lf-menu-item lf-danger-text" onClick={(e) => { onDelete(contract.contractId, e); setActiveMenu(null); }}>
                            <Trash2 size={16} /> <span>{t('contracts.deleteButtonTitle')}</span>
                        </button>
                    </ActionMenu>
                </div>
            </div>

            {/* Gauge or Processing State */}
            <div className="lf-card-gauge-area">
                {hasScore ? (
                      <div className="lf-gauge-container" style={{ '--percentage': animatedScore, '--gauge-color': scoreData.color }}>
                          <div className="lf-gauge-track"></div>

                          <div className="lf-gauge-reveal">
                              <div className="lf-gauge-gradient"></div>
                          </div>

                          <div className="lf-gauge-content">
                              <span className="lf-gauge-score">{animatedScore}</span>
                            <span className="lf-gauge-label">{t('contracts.riskScore')}</span>
                        </div>
                    </div>
                ) : isFailed ? (
                    <div className="lf-gauge-failed">
                        <AlertTriangle size={40} className="lf-danger-text" />
                        <span className="lf-gauge-label mt-2">{t('contracts.analysisFailed')}</span>
                    </div>
                ) : (
                    <div className="lf-gauge-processing">
                        <div className="lf-pulse-bar-wrap">
                            <div className="lf-pulse-bar"></div>
                        </div>
                        <span className="lf-gauge-label mt-3">{t('contracts.processingData')}</span>
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="lf-card-meta">
                <div className="lf-meta-item">
                    <div className="lf-meta-icon"><MapPin size={18} /></div>
                    <div className="lf-meta-text">
                        <span className="lf-meta-lbl">{t('contracts.propertyAddress')}</span>
                        <span className="lf-meta-val">{contract.propertyAddress || t('contracts.notSpecified')}</span>
                    </div>
                </div>
                <div className="lf-meta-item">
                    <div className="lf-meta-icon"><Users size={18} /></div>
                    <div className="lf-meta-text">
                        <span className="lf-meta-lbl">{t('contracts.landlordName')}</span>
                        <span className="lf-meta-val">{contract.landlordName || t('contracts.notSpecified')}</span>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="lf-card-footer">
                {isAnalyzed ? (
                    <Link to={`/analysis/${encodeURIComponent(contract.contractId)}`} state={{ contract }} className="lf-btn-view">
                        {t('contracts.viewAnalysis')}
                    </Link>
                ) : (
                    <button className="lf-btn-view disabled" disabled>
                        {isFailed ? t('contracts.statusFailedShort') : t('contracts.statusPendingShort')}
                    </button>
                )}

                <div className="lf-card-footer-actions">
                    <button
                        type="button"
                        className="lf-btn-edit"
                        onClick={(e) => onEdit(contract, e)}
                        title={t('contracts.editButtonTitle')}
                        aria-label={t('contracts.editButtonTitle')}
                    >
                        <Pencil size={18} />
                    </button>

                    <ActionMenu
                        isOpen={activeMenu === 'export'}
                        onToggle={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                        onClose={() => setActiveMenu(null)}
                        containerClassName="lf-card-menu-wrap"
                        triggerClassName="lf-btn-download"
                        triggerContent={<Download size={20} />}
                        panelClassName={`lf-dropdown-menu export-menu ${isRTL ? 'rtl' : 'ltr'}`}
                    >
                        <div className="lf-menu-title">{t('contracts.menuDownloadTitle')}</div>
                        <button className="lf-menu-item" onClick={() => { onExport(contract); setActiveMenu(null); }} disabled={!isAnalyzed}>
                            <FileText size={16} /> <span>{t('contracts.menuExportWordTitle')}</span>
                        </button>
                    </ActionMenu>
                </div>
            </div>
        </div>
    );
};

export default ContractCard;
