/**
 * ============================================
 *  AnalysisPage
 *  Contract Analysis Results Display (LexisFlow Modern UI)
 * ============================================
 * 
 * STRUCTURE:
 * - Tabbed interface for Contract issues vs full view
 * - Sidebar for sharing & summary
 * - Export to Word capability
 * 
 * DEPENDENCIES:
 * - useAnalysisPage (logic hook)
 * - Component sub-files (AnalysisHeader, AnalysisBentoGrid, etc.)
 * ============================================
 */
import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import {
    Hourglass,
    Timer,
    XCircle,
    AlertCircle,
    Eraser,
    FileText,
    RefreshCw
} from 'lucide-react';
import './AnalysisPage.css';

import { useAnalysisPage } from '@/features/analysis/hooks/useAnalysisPage';
import AnalysisHeader from '@/features/analysis/components/AnalysisHeader';
import AnalysisBentoGrid from '@/features/analysis/components/AnalysisBentoGrid';
import AnalysisResults from '@/features/analysis/components/AnalysisResults';
import AnalysisSidebar from '@/features/analysis/components/AnalysisSidebar';
import { SharePanel } from '@/features/analysis/components/AnalysisModals';
import { exportEditedContract } from '@/features/analysis/services/ContractExportService';
import { showAppToast as emitAppToast } from '@/utils/toast';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';


const AnalysisPage = () => {
    const hookState = useAnalysisPage();
    const {
        analysis,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        expandedIssue,
        setExpandedIssue,
        showExportMenu,
        setShowExportMenu,
        copiedIndex,
        setCopiedIndex,
        isExporting,
        isGeneratingShareLink,
        isSharingLink,
        isRevokingShareLink,
        shareLink,
        shareLinkExpiresAt,
        isSharePanelVisible,
        isShareAccordionOpen,
        setIsShareAccordionOpen,
        contractEditState,
        setContractEditState,
        setEditedClauses,
        _editedClauses: editedClauses,
        contractId,
        contractViewRef,
        sharePanelRef,
        fetchAnalysis,
        handleExportWord,
        handleCopyShareLink,
        handleManualCopyShareLink,
        handleShareLinkViaApps,
        handleRevokeShareLink,
        handleSaveToCloud,
        copyTextToClipboard,
        showExportNotice,
        t,
        isRTL
    } = hookState;

    const getShareExpiryLabel = useCallback(() => {
        if (!shareLinkExpiresAt) return t('analysis.shareExpiryDefault');
        const secondsLeft = Math.floor(shareLinkExpiresAt - (Date.now() / 1000));
        if (secondsLeft <= 0) return t('analysis.shareExpiryExpired');
        const daysLeft = Math.ceil(secondsLeft / 86400);
        if (isRTL) return t('analysis.shareExpiryDays').replace('{days}', String(daysLeft));
        if (daysLeft === 1) return t('analysis.shareExpiryDaysOne');
        return t('analysis.shareExpiryDaysMany').replace('{days}', String(daysLeft));
    }, [isRTL, shareLinkExpiresAt, t]);

    const getRiskLabel = (level) => {
        const labels = { High: 'high', Medium: 'medium', Low: 'low' };
        return labels[level] || 'medium';
    };

    const getHealthTier = (score) => {
        if (score >= 86) return 'health-excellent';
        if (score >= 71) return 'health-good';
        if (score >= 51) return 'health-warning';
        return 'health-danger';
    };

    const pickInlineText = (...candidates) => {
        for (const value of candidates) {
            if (value === null || value === undefined) continue;
            const text = String(value).replace(/\s+/g, ' ').trim();
            if (text) return text;
        }
        return '';
    };

    const pickBlockText = (...candidates) => {
        for (const value of candidates) {
            if (value === null || value === undefined) continue;
            const text = String(value).trim();
            if (text) return text;
        }
        return '';
    };

    const handleExportContractWord = useCallback(async () => {
        setShowExportMenu(false);

        const exportResult = analysis?.analysis_result || analysis;
        const exportIssues = exportResult?.issues || [];
        const contractText = analysis?.normalizedContractText || '';
        const backendClauses = analysis?.clauses_list || analysis?.clauses || [];

        if (!String(contractText).trim() && backendClauses.length === 0) {
            showExportNotice(t('analysis.fullContractExportNotReady'));
            return;
        }

        const baseFileName = `${(analysis?.fileName || t('export.defaultContractFilename')).replace(/\.(pdf|docx)$/i, '')}`;

        emitAppToast({
            type: 'warning',
            title: t('contractView.ocrDisclaimerTitle'),
            message: t('contractView.ocrDisclaimerBody2'),
            ttlMs: 5000,
        });
        emitAppToast({ type: 'info', message: t('export.started') });

        try {
            await exportEditedContract(contractText, editedClauses || {}, exportIssues, baseFileName, backendClauses);
            emitAppToast({ type: 'success', message: t('export.success') });
        } catch (error) {
            console.error('Full contract export error:', error);
            emitAppToast({ type: 'error', message: t('export.error') });
        }
    }, [
        analysis,
        editedClauses,
        setShowExportMenu,
        showExportNotice,
        t,
    ]);

    if (isLoading) {
        return (
            <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="lf-loading-state">
                    <GlobalSpinner size={40} />
                </div>
            </div>
        );
    }

    if (error) {
        let ErrorIconComponent;
        switch (error.type) {
            case 'processing': ErrorIconComponent = <Hourglass className="lf-error-icon" size={48} />; break;
            case 'timeout': ErrorIconComponent = <Timer className="lf-error-icon" size={48} />; break;
            case 'failed': ErrorIconComponent = <XCircle className="lf-error-icon" size={48} />; break;
            default: ErrorIconComponent = <AlertCircle className="lf-error-icon" size={48} />;
        }
        return (
            <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`lf-error-box error-${error.type}`}>
                    {ErrorIconComponent}
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="lf-error-details">
                            <summary>{t('analysis.technicalDetails')}</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="lf-error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>{t('analysis.tryAgain')}</Button>
                        <Link to="/contracts"><Button variant="secondary">{t('analysis.backToContracts')}</Button></Link>
                    </div>
                </div>
            </div>
        );
    }

    const result = analysis?.analysis_result || analysis;
    const riskScore = result?.overall_risk_score || 0;
    const issues = result?.issues || [];
    const scoreBreakdown = result?.score_breakdown || {};

    return (
        <div className="lf-page-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* 1. Global Header & Tabs */}
            <AnalysisHeader
                analysis={analysis}
                result={result}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                issuesCount={issues.length}
                t={t}
                isRTL={isRTL}
            />

            {/* 3. Main Layout Container */}
            <div className="lf-main-container">
                
                {/* BENTO GRID */}
                <AnalysisBentoGrid
                    activeTab={activeTab}
                    riskScore={riskScore}
                    getHealthTier={getHealthTier}
                    fetchAnalysis={fetchAnalysis}
                    showExportMenu={showExportMenu}
                    setShowExportMenu={setShowExportMenu}
                    handleExportWord={handleExportWord}
                    handleExportContractWord={handleExportContractWord}
                    isExporting={isExporting}
                    issuesCount={issues.length}
                    analysis={analysis}
                    isRTL={isRTL}
                    t={t}
                />

                {activeTab === 'issues' && issues.length > 0 && (
                    <div className="lf-section-divider lf-section-divider-desktop no-print">
                        <div className="lf-line"></div>
                        <h2>{t('analysis.deepAnalysisAndClauses')}</h2>
                        <div className="lf-line"></div>
                    </div>
                )}

                {/* 4. Two-Column Analysis Area */}
                <div className="lf-analysis-columns">
                    
                    {/* Left Column: Issues List or Contract View */}
                    <div className="lf-main-content">
                        {activeTab === 'issues' && issues.length > 0 && (
                            <div className="lf-section-divider lf-section-divider-mobile no-print">
                                <div className="lf-line"></div>
                                <h2>{t('analysis.deepAnalysisAndClauses')}</h2>
                                <div className="lf-line"></div>
                            </div>
                        )}

                        {activeTab === 'contract' && result?.is_contract !== false && (
                            <div className="lf-contract-actions-wrapper no-print">
                                <div className="lf-contract-export-bar">
                                    <div className="lf-contract-export-row">
                                        <button className="lf-contract-export-btn" onClick={() => contractViewRef.current?.handleExport()}>
                                            <FileText size={16} />
                                            <span>{t('analysis.exportEditedWord')}</span>
                                        </button>
                                        <button
                                            className="lf-contract-reset-btn"
                                            title={t('analysis.resetEditsTitle')}
                                            onClick={() => contractViewRef.current?.requestClearAll()}
                                            disabled={contractEditState.editedCount === 0}
                                        >
                                            <Eraser size={16} />
                                            <span>{t('analysis.resetEdits')}</span>
                                            <span className="lf-contract-reset-counter">{contractEditState.editedCount}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <AnalysisResults
                            activeTab={activeTab}
                            issues={issues}
                            result={result}
                            analysis={analysis}
                            contractId={contractId}
                            expandedIssue={expandedIssue}
                            setExpandedIssue={setExpandedIssue}
                            copiedIndex={copiedIndex}
                            setCopiedIndex={setCopiedIndex}
                            contractViewRef={contractViewRef}
                            contractEditState={contractEditState}
                            setContractEditState={setContractEditState}
                            editedClauses={editedClauses}
                            setEditedClauses={setEditedClauses}
                            handleSaveToCloud={handleSaveToCloud}
                            copyTextToClipboard={copyTextToClipboard}
                            showExportNotice={showExportNotice}
                            t={t}
                            getRiskLabel={getRiskLabel}
                            pickInlineText={pickInlineText}
                            pickBlockText={pickBlockText}
                            exportEditedContract={exportEditedContract}
                        />
                    </div>

                    {/* Right Column: Sticky Sidebar Context */}
                    <AnalysisSidebar
                        activeTab={activeTab}
                        isContractDocument={result?.is_contract !== false}
                        riskScore={riskScore}
                        scoreBreakdown={scoreBreakdown}
                        issues={issues}
                        ShareComponent={
                            <SharePanel
                                result={result}
                                isShareAccordionOpen={isShareAccordionOpen}
                                setIsShareAccordionOpen={setIsShareAccordionOpen}
                                shareLink={shareLink}
                                isSharePanelVisible={isSharePanelVisible}
                                handleCopyShareLink={handleCopyShareLink}
                                isGeneratingShareLink={isGeneratingShareLink}
                                sharePanelRef={sharePanelRef}
                                getShareExpiryLabel={getShareExpiryLabel}
                                handleManualCopyShareLink={handleManualCopyShareLink}
                                handleShareLinkViaApps={handleShareLinkViaApps}
                                isSharingLink={isSharingLink}
                                handleRevokeShareLink={handleRevokeShareLink}
                                isRevokingShareLink={isRevokingShareLink}
                                t={t}
                            />
                        }
                    />

                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;
