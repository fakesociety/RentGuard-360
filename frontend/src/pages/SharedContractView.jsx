import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { getSharedAnalysis } from '../services/api';
import ContractView from '../components/ContractView';
import Card from '../components/Card';
import './SharedContractView.css';

const SharedContractView = () => {
    const { id } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const contractViewRef = useRef(null);

    const shareToken = useMemo(() => decodeURIComponent(id || ''), [id]);

    const fetchSharedAnalysis = useCallback(async () => {
        if (!shareToken) {
            setError('קישור לא תקין');
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
            setError('לא ניתן לטעון את החוזה מהקישור הזה.');
        } finally {
            setIsLoading(false);
        }
    }, [shareToken]);

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
            <div className="shared-contract-page" dir="rtl">
                <div className="shared-loading">
                    <div className="loading-spinner"></div>
                    <p>טוען חוזה משותף...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-contract-page" dir="rtl">
                <Card variant="glass" padding="lg" className="shared-error-card">
                    <h2>שגיאה</h2>
                    <p>{error}</p>
                    <button className="shared-retry-btn" onClick={fetchSharedAnalysis}>נסה שוב</button>
                    <Link to="/" className="shared-home-link">חזרה לדף הבית</Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="shared-contract-page" dir="rtl">
            <header className="shared-contract-header">
                <div>
                    <h1>צפייה בחוזה משותף</h1>
                    <p className="shared-subtitle">מצב צפייה בלבד. ניתן להוריד את המסמך ל-Word.</p>
                </div>
                <button
                    className="shared-download-btn"
                    onClick={() => contractViewRef.current?.handleExport()}
                >
                    <Download size={18} />
                    <span>הורדה ל-Word</span>
                </button>
            </header>

            {!isContract ? (
                <Card variant="glass" padding="lg" className="shared-error-card">
                    <h2>המסמך אינו חוזה שכירות</h2>
                    <p>לא ניתן להציג את תוכן המסמך בקישור זה.</p>
                </Card>
            ) : (
                <ContractView
                    ref={contractViewRef}
                    contractText={contractText}
                    backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                    issues={issues}
                    initialEditedClauses={sharedEditedClauses}
                    contractId={null}
                    readOnly={true}
                />
            )}
        </div>
    );
};

export default SharedContractView;
