import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getSharedAnalysis } from '../../services/api';
import ContractView from '../../components/domain/ContractView';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import './SharedContractView.css';

const SharedContractView = () => {
    const { t, isRTL } = useLanguage();
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const contractViewRef = useRef(null);

    const shareToken = useMemo(() => decodeURIComponent(id || ''), [id]);

    const fetchSharedAnalysis = useCallback(async () => {
        if (!shareToken) {
            setError(t('sharedContract.invalidLink'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const data = await getSharedAnalysis(shareToken);
            setAnalysis(data);
        } catch (err) {
            console.error('Failed to load shared contract', err);
            setError(t('sharedContract.loadFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [shareToken, t]);

    useEffect(() => {
        fetchSharedAnalysis();
    }, [fetchSharedAnalysis]);

    const result = analysis?.analysis_result || analysis;
    const isContract = result?.is_contract !== false;
    const issues = [];

    const contractText =
        analysis?.fullEditedText ||
        analysis?.sanitizedText ||
        analysis?.full_text ||
        analysis?.contractText ||
        analysis?.extracted_text ||
        '';

    const sharedEditedClauses = useMemo(() => {
        if (analysis?.editedClauses && typeof analysis.editedClauses === 'object') {
            return analysis.editedClauses;
        }

        const originalClauses = Array.isArray(analysis?.originalClausesList)
            ? analysis.originalClausesList
            : (Array.isArray(analysis?.original_clauses_list) ? analysis.original_clauses_list : []);
        const currentClauses = Array.isArray(analysis?.clauses_list)
            ? analysis.clauses_list
            : (Array.isArray(analysis?.clauses) ? analysis.clauses : []);

        if (!originalClauses.length || !currentClauses.length) {
            return {};
        }

        const delta = {};
        const maxLen = Math.max(originalClauses.length, currentClauses.length);
        for (let idx = 0; idx < maxLen; idx += 1) {
            const originalText = String(originalClauses[idx] || '').trim();
            const currentText = String(currentClauses[idx] || '').trim();
            if (currentText && originalText !== currentText) {
                delta[`clause-${idx}`] = { text: currentText, action: 'shared-diff' };
            }
        }

        return delta;
    }, [analysis]);

    if (isLoading) {
        return (
            <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="shared-state-card shared-state-loading">
                    <div className="shared-loading-spinner"></div>
                    <h2>{t('sharedContract.loadingTitle')}</h2>
                    <p>{t('sharedContract.loadingSubtitle')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
                <section className="shared-state-card shared-state-error">
                    <AlertTriangle size={24} aria-hidden="true" />
                    <h2>{t('sharedContract.errorTitle')}</h2>
                    <p>{error}</p>
                    <div className="shared-state-actions">
                        <button className="shared-btn shared-btn-primary" onClick={fetchSharedAnalysis}>{t('sharedContract.retryButton')}</button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="shared-hero">
                <div className="shared-hero-text">
                    <span className="shared-kicker">RentGuard 360</span>
                    <h1>{t('sharedContract.viewTitle')}</h1>
                    <p className="shared-subtitle">{t('sharedContract.viewSubtitle')}</p>
                </div>
                <div className="shared-hero-actions">
                    <button
                        className="shared-btn shared-btn-primary"
                        onClick={() => contractViewRef.current?.handleExport()}
                    >
                        <Download size={18} />
                        <span>{t('sharedContract.exportWord')}</span>
                    </button>
                </div>
            </header>

            <main className="shared-contract-content">
                {!isContract ? (
                    <section className="shared-state-card shared-state-warning">
                        <ShieldCheck size={24} aria-hidden="true" />
                        <h2>{t('sharedContract.notRentalTitle')}</h2>
                        <p>{t('sharedContract.notRentalDesc')}</p>
                    </section>
                ) : (
                    <section className="shared-contract-stage">
                        <ContractView
                            ref={contractViewRef}
                            contractText={contractText}
                            backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                            issues={issues}
                            initialEditedClauses={sharedEditedClauses}
                            contractId={null}
                            readOnly={true}
                        />
                    </section>
                )}
            </main>
        </div>
    );
};

export default SharedContractView;
