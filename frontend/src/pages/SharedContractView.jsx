import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getSharedAnalysis } from '../services/api';
import ContractView from '../components/ContractView';
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
            <div className="shared-contract-shell" dir="rtl">
                <div className="shared-state-card shared-state-loading">
                    <div className="shared-loading-spinner"></div>
                    <h2>טוען חוזה משותף...</h2>
                    <p>אוספים את מסמך החוזה בצורה מאובטחת, זה ייקח רגע.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-contract-shell" dir="rtl">
                <section className="shared-state-card shared-state-error">
                    <AlertTriangle size={24} aria-hidden="true" />
                    <h2>שגיאה בטעינת החוזה</h2>
                    <p>{error}</p>
                    <div className="shared-state-actions">
                        <button className="shared-btn shared-btn-primary" onClick={fetchSharedAnalysis}>נסה שוב</button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="shared-contract-shell" dir="rtl">
            <header className="shared-hero">
                <div className="shared-hero-text">
                    <span className="shared-kicker">RentGuard 360</span>
                    <h1>צפייה בחוזה משותף</h1>
                    <p className="shared-subtitle">מצב צפייה בלבד. אפשר לעיין בתוכן ולהוריד את המסמך המעודכן ל-Word.</p>
                </div>
                <div className="shared-hero-actions">
                    <button
                        className="shared-btn shared-btn-primary"
                        onClick={() => contractViewRef.current?.handleExport()}
                    >
                        <Download size={18} />
                        <span>ייצוא כקובץ docx (Word)</span>
                    </button>
                </div>
            </header>

            <main className="shared-contract-content">
                {!isContract ? (
                    <section className="shared-state-card shared-state-warning">
                        <ShieldCheck size={24} aria-hidden="true" />
                        <h2>המסמך אינו חוזה שכירות</h2>
                        <p>לא ניתן להציג את תוכן המסמך בקישור זה.</p>
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
