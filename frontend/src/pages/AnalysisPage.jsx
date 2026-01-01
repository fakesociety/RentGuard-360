import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getAnalysis, consultClause, saveEditedContract } from '../services/api';
import { exportToWord, exportToPDF, exportEditedContract } from '../services/ExportService';
import { useLanguage } from '../contexts/LanguageContext';
import Card from '../components/Card';
import Button from '../components/Button';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ScoreMethodology from '../components/ScoreMethodology';
import ContractView from '../components/ContractView';
import { FileText, Scale, AlertTriangle, Lightbulb, CheckCircle, Copy, Check, MessageCircle } from 'lucide-react';
import './AnalysisPage.css';
import './LegalCard.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
    const { state } = useLocation(); // Get passed state from navigation
    const { t, isRTL } = useLanguage();

    // Initialize with passed contract data if available (instant load)
    const [analysis, setAnalysis] = useState(state?.contract || null);
    const [isLoading, setIsLoading] = useState(!state?.contract); // Only show loading if no data passed
    const [error, setError] = useState(null);
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [consultingIssue, setConsultingIssue] = useState(null);
    const [aiExplanation, setAiExplanation] = useState({});
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('issues'); // 'issues' or 'contract'
    const [editedClauses, setEditedClauses] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_ATTEMPTS = 12; // 12 attempts = ~2 minutes total
    const INITIAL_DELAY = 15000; // Wait 15s before first poll (analysis takes 30-60s)
    const POLL_INTERVAL = 10000; // Then poll every 10 seconds

    useEffect(() => {
        fetchAnalysis();
    }, [contractId]);

    // Auto-polling when analysis is still processing
    useEffect(() => {
        // Only poll if we have a 'processing' error and haven't exceeded max attempts
        if (error?.type === 'processing' && pollCount < MAX_POLL_ATTEMPTS && !USE_MOCK) {
            // Use longer delay for first poll (analysis takes 30-60s typically)
            const delay = pollCount === 0 ? INITIAL_DELAY : POLL_INTERVAL;
            console.log(`Auto-polling in ${delay / 1000}s... (attempt ${pollCount + 1}/${MAX_POLL_ATTEMPTS})`);

            const pollTimer = setTimeout(() => {
                setPollCount(prev => prev + 1);
                fetchAnalysis();
            }, delay);

            return () => clearTimeout(pollTimer);
        }
    }, [error, pollCount]);

    // Reset poll count when analysis succeeds
    useEffect(() => {
        if (analysis) {
            setPollCount(0);
        }
    }, [analysis]);

    const fetchAnalysis = async () => {
        try {
            // Only show loading spinner on first load, not during polling
            if (pollCount === 0) {
                setIsLoading(true);
            }
            // Don't reset error during polling - otherwise the polling useEffect won't trigger
            // setError(null) will happen when data is successfully fetched

            const decodedId = decodeURIComponent(contractId);
            console.log('Fetching analysis for:', decodedId);
            const data = await getAnalysis(decodedId);
            setAnalysis(prev => ({
                ...prev, // Keep existing metadata (like from navigation state)
                ...data, // Overwrite with fresh data
                // Ensure metadata persists if api returns nulls but we had them in state
                fileName: data.fileName || prev?.fileName || data.fileName,
                propertyAddress: data.propertyAddress || prev?.propertyAddress || data.propertyAddress,
                landlordName: data.landlordName || prev?.landlordName || data.landlordName,
                uploadDate: data.uploadDate || prev?.uploadDate || data.uploadDate,
            }));
            setError(null); // Clear error on success
        } catch (err) {
            console.error('Failed to fetch analysis:', err);

            // Parse error message for user-friendly display
            const errorMsg = err.message || '';

            if (errorMsg.includes('404')) {
                setError({
                    title: 'Analysis Not Ready',
                    message: `Your contract is still being processed. Auto-checking... (${pollCount + 1}/${MAX_POLL_ATTEMPTS})`,
                    type: 'processing'
                });
            } else if (errorMsg.includes('FAILED') || errorMsg.includes('ValidationException')) {
                setError({
                    title: 'Analysis Failed',
                    message: 'There was an error analyzing your contract. Our team has been notified. Please try uploading again.',
                    type: 'failed',
                    details: errorMsg
                });
            } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
                setError({
                    title: 'Analysis Timed Out',
                    message: 'The analysis is taking longer than expected. Please check back in a few minutes.',
                    type: 'timeout'
                });
            } else {
                setError({
                    title: 'Something Went Wrong',
                    message: 'Failed to load analysis results. Please try again.',
                    type: 'error',
                    details: errorMsg
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Ask AI to explain a clause
    const handleConsultClause = async (issue, index) => {
        setConsultingIssue(index);
        try {
            const response = await consultClause(
                decodeURIComponent(contractId),
                issue.original_text || issue.clause_topic
            );
            setAiExplanation(prev => ({
                ...prev,
                [index]: response.explanation
            }));
        } catch (err) {
            console.error('Consult failed:', err);
            setAiExplanation(prev => ({
                ...prev,
                [index]: 'Failed to get AI explanation. Please try again.'
            }));
        } finally {
            setConsultingIssue(null);
        }
    };

    const getRiskLabel = (level) => {
        const labels = { High: 'high', Medium: 'medium', Low: 'low' };
        return labels[level] || 'medium';
    };

    if (isLoading) {
        return (
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>{t('analysis.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        const errorIcon = {
            processing: '⏳',
            timeout: '⏱️',
            failed: '❌',
            error: '⚠️'
        }[error.type] || '⚠️';

        return (
            <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`error-state error-${error.type}`}>
                    <div className="error-icon">{errorIcon}</div>
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="error-details">
                            <summary>{isRTL ? 'פרטים טכניים' : 'Technical Details'}</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>{isRTL ? 'נסה שוב' : 'Try Again'}</Button>
                        <Link to="/contracts">
                            <Button variant="secondary">{t('analysis.backToContracts')}</Button>
                        </Link>
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
        <div className="analysis-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="analysis-header animate-fadeIn">
                <Link to="/contracts" className="back-link">{isRTL ? '→' : '←'} {t('analysis.backToContracts')}</Link>
                <h1>{t('analysis.title')}</h1>
            </div>

            <div className="analysis-layout">
                {/* Sticky Sidebar - Left */}
                <aside className="analysis-sidebar">
                    <Card variant="glass" padding="md" className="sidebar-card">
                        {/* Contract Brand Card - Premium Design */}
                        <div className="contract-hero-card animate-slideIn">
                            <div className="contract-card-header">
                                <div className="contract-icon-wrapper">
                                    <span className="contract-icon-main">📄</span>
                                    <div className="icon-glow"></div>
                                </div>
                                <h3 className="contract-hero-title">
                                    {analysis?.fileName || (isRTL ? 'מסמך חוזה' : 'Contract Document')}
                                </h3>
                            </div>

                            <div className="contract-hero-meta">
                                {analysis?.propertyAddress && (
                                    <div className="meta-block">
                                        <span className="meta-label">{t('contracts.propertyAddress')}</span>
                                        <span className="meta-value address-value">{analysis.propertyAddress}</span>
                                    </div>
                                )}
                                <div className="meta-row">
                                    {analysis?.landlordName && (
                                        <div className="meta-block half-width">
                                            <span className="meta-label">{t('contracts.landlordName')}</span>
                                            <span className="meta-value">{analysis.landlordName}</span>
                                        </div>
                                    )}
                                    {analysis?.uploadDate && (
                                        <div className="meta-block half-width">
                                            <span className="meta-label">{t('contracts.uploadDate')}</span>
                                            <span className="meta-value">
                                                {new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-divider"></div>

                        {/* Summary - Prominent */}
                        <div className="sidebar-summary-hero">
                            <h4>{t('analysis.summary')}</h4>
                            <p>{result?.summary || (isRTL ? 'הניתוח הושלם.' : 'Analysis complete.')}</p>
                            {result?.is_contract === false && (
                                <div className="not-contract-warning">
                                    ⚠️ {t('analysis.notContract')}
                                </div>
                            )}
                        </div>

                        <div className="sidebar-divider"></div>

                        {/* Score Section */}
                        <ScoreBreakdown
                            overallScore={riskScore}
                            breakdown={scoreBreakdown}
                            issues={issues}
                        />

                        {/* Score Methodology Explanation */}
                        <ScoreMethodology />

                        <div className="sidebar-divider"></div>

                        {/* Actions */}
                        <div className="sidebar-actions">
                            <button className="sidebar-action-btn" onClick={fetchAnalysis}>
                                🔄 {t('analysis.refresh')}
                            </button>
                            <div className="export-dropdown-sidebar">
                                <button
                                    className="sidebar-action-btn"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                >
                                    📥 {t('analysis.export')} {showExportMenu ? '▲' : '▼'}
                                </button>
                                {showExportMenu && (
                                    <div className="export-menu-sidebar">
                                        <div className="export-menu-title">{isRTL ? 'ייצוא דוח הניתוח' : 'Export Analysis Report'}</div>
                                        <button
                                            onClick={async () => {
                                                setIsExporting(true);
                                                try {
                                                    await exportToWord(analysis, analysis?.fileName || (isRTL ? 'דוח_ניתוח' : 'Analysis_Report'));
                                                } finally {
                                                    setIsExporting(false);
                                                    setShowExportMenu(false);
                                                }
                                            }}
                                            disabled={isExporting}
                                        >
                                            📝 Word - {isRTL ? 'דוח ניתוח' : 'Analysis Report'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsExporting(true);
                                                try {
                                                    await exportToPDF(analysis, analysis?.fileName || (isRTL ? 'דוח_ניתוח' : 'Analysis_Report'));
                                                } finally {
                                                    setIsExporting(false);
                                                    setShowExportMenu(false);
                                                }
                                            }}
                                            disabled={isExporting}
                                        >
                                            📕 PDF - {isRTL ? 'דוח ניתוח' : 'Analysis Report'}
                                            <span className="export-note">{isRTL ? '(אנגלית בלבד)' : '(English only)'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </aside>

                {/* Main Content - Right */}
                <main className="analysis-main">

                    {/* Tab Navigation */}
                    <div className="analysis-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
                            onClick={() => setActiveTab('issues')}
                        >
                            {t('analysis.issues')} ({issues.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contract')}
                        >
                            {isRTL ? 'החוזה המלא' : 'Full Contract'}
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'issues' && issues.length > 0 && (
                        <section className="issues-section" dir={isRTL ? 'rtl' : 'ltr'}>
                            <h2 className="section-title-hebrew">
                                {t('analysis.issues')} ({issues.length})
                            </h2>
                            <div className="issues-list">
                                {issues.map((issue, index) => {
                                    const handleCopy = async (text, idx) => {
                                        try {
                                            await navigator.clipboard.writeText(text);
                                            setCopiedIndex(idx);
                                            setTimeout(() => setCopiedIndex(null), 2000);
                                        } catch (err) {
                                            console.error('Failed to copy:', err);
                                        }
                                    };

                                    const riskClass = getRiskLabel(issue.risk_level);

                                    return (
                                        <div
                                            key={index}
                                            className={`legal-card ${riskClass} animate-slideUp`}
                                            style={{ animationDelay: `${index * 80}ms` }}
                                        >
                                            {/* Severity Indicator Glow */}
                                            <div className={`severity-glow ${riskClass}`}></div>

                                            {/* Card Header */}
                                            <div
                                                className="legal-card-header"
                                                onClick={() => setExpandedIssue(expandedIssue === index ? null : index)}
                                            >
                                                <div className="legal-header-main">
                                                    <h3 className="legal-title">{issue.clause_topic}</h3>
                                                    <div className="legal-meta">
                                                        {/* Risk Badge - Pill with dot */}
                                                        <span className={`risk-pill ${riskClass}`}>
                                                            <span className="risk-dot"></span>
                                                            {issue.risk_level === 'High' && t('score.highRisk')}
                                                            {issue.risk_level === 'Medium' && t('score.mediumRisk')}
                                                            {issue.risk_level === 'Low' && t('score.lowRisk')}
                                                        </span>
                                                        {issue.penalty_points && (
                                                            <span className="points-badge">
                                                                -{issue.penalty_points} {isRTL ? 'נקודות' : 'points'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button className={`expand-trigger ${expandedIssue === index ? 'expanded' : ''}`}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Card Content */}
                                            <div className={`legal-card-content ${expandedIssue === index ? 'expanded' : ''}`}>

                                                {/* Original Clause - Quote Style */}
                                                {issue.original_text && (
                                                    <div className="legal-section quote-section">
                                                        <div className="section-icon">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="section-body">
                                                            <h4 className="section-label">{isRTL ? 'הסעיף המקורי' : t('analysis.original')}</h4>
                                                            <blockquote className="original-quote">
                                                                "{issue.original_text}"
                                                            </blockquote>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Legal Basis - Compact */}
                                                {issue.legal_basis && (
                                                    <div className="legal-section compact-section">
                                                        <div className="section-icon legal-icon">
                                                            <Scale size={18} />
                                                        </div>
                                                        <div className="section-body">
                                                            <h4 className="section-label">{isRTL ? 'בסיס משפטי' : 'Legal Basis'}</h4>
                                                            <p className="legal-basis-text">{issue.legal_basis}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Why It Matters - Explanation */}
                                                <div className="legal-section explanation-section">
                                                    <div className="section-icon explanation-icon">
                                                        <Lightbulb size={18} />
                                                    </div>
                                                    <div className="section-body">
                                                        <h4 className="section-label">{isRTL ? 'למה זה חשוב?' : 'Why It Matters'}</h4>
                                                        <p className="explanation-text">{issue.explanation}</p>
                                                    </div>
                                                </div>

                                                {/* Recommendation - Highlighted */}
                                                {issue.suggested_fix && (
                                                    <div className="legal-section recommendation-section">
                                                        <div className="section-icon recommendation-icon">
                                                            <CheckCircle size={18} />
                                                        </div>
                                                        <div className="section-body">
                                                            <h4 className="section-label">{isRTL ? 'הנוסח המומלץ' : t('analysis.recommendation')}</h4>
                                                            <div className="recommendation-box">
                                                                <p className="recommendation-text">{issue.suggested_fix}</p>
                                                                <button
                                                                    className={`copy-button ${copiedIndex === index ? 'copied' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopy(issue.suggested_fix, index);
                                                                    }}
                                                                >
                                                                    {copiedIndex === index ? (
                                                                        <>
                                                                            <Check size={16} />
                                                                            <span>{t('analysis.copied')}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy size={16} />
                                                                            <span>{t('analysis.copyFix')}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Negotiation Tip */}
                                                {issue.negotiation_tip && (
                                                    <div className="legal-section tip-section">
                                                        <div className="section-icon tip-icon">
                                                            <MessageCircle size={18} />
                                                        </div>
                                                        <div className="section-body">
                                                            <h4 className="section-label tip-label">💡 {isRTL ? 'טיפ למשא ומתן' : 'Negotiation Tip'}</h4>
                                                            <p className="tip-text">{issue.negotiation_tip}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {activeTab === 'issues' && issues.length === 0 && (
                        <Card variant="glass" padding="lg" className={`no-issues animate-slideUp ${result?.is_contract === false ? 'not-contract' : ''}`}>
                            <div className="no-issues-content">
                                {result?.is_contract === false ? (
                                    <>
                                        <span className="no-issues-icon warning">⚠️</span>
                                        <h3>{isRTL ? 'זה לא חוזה שכירות' : 'Not a Rental Contract'}</h3>
                                        <p>{isRTL ? 'המסמך שהועלה אינו נראה כחוזה שכירות תקין. אנא העלו חוזה שכירות למגורים בפורמט PDF.' : 'The uploaded document does not appear to be a valid rental contract. Please upload a residential rental contract in PDF format.'}</p>
                                    </>
                                ) : (
                                    <>
                                        <span className="no-issues-icon">✅</span>
                                        <h3>{t('analysis.noIssues')}</h3>
                                        <p>{isRTL ? 'חוזה זה נראה תקין ללא דגלים אדומים משמעותיים.' : 'This contract appears to be in good standing with no significant red flags.'}</p>
                                    </>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Full Contract View Tab */}
                    {activeTab === 'contract' && (
                        <ContractView
                            contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                            backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                            issues={issues}
                            contractId={analysis?.contractId || contractId}
                            onClauseChange={(clauseId, text, action) => {
                                setEditedClauses(prev => ({
                                    ...prev,
                                    [clauseId]: { text, action }
                                }));
                            }}
                            onExportEdited={async (editedClausesMap) => {
                                // Export edited contract to Word with Hebrew
                                const contractText = analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || '';
                                const backendClauses = analysis?.clauses_list || analysis?.clauses || [];
                                await exportEditedContract(contractText, editedClausesMap, issues, 'Edited_Contract', backendClauses);
                            }}
                            onSaveToCloud={async (clauses, fullEditedText) => {
                                // Save to AWS (S3 + DynamoDB)
                                const userId = 'user-' + Date.now(); // TODO: Get from AuthContext
                                const contractIdClean = analysis?.contractId || contractId;
                                await saveEditedContract(contractIdClean, userId, clauses, fullEditedText);
                            }}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default AnalysisPage;

