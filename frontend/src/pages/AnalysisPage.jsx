import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, consultClause, saveEditedContract } from '../services/api';
import { exportToWord, exportToPDF, exportEditedContract } from '../services/ExportService';
import { useLanguage } from '../contexts/LanguageContext';
import Card from '../components/Card';
import Button from '../components/Button';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ContractView from '../components/ContractView';
import { FileText, Scale, AlertTriangle, Lightbulb, CheckCircle, Copy, Check, MessageCircle } from 'lucide-react';
import './AnalysisPage.css';
import './LegalCard.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
    const { t, isRTL } = useLanguage();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedIssue, setExpandedIssue] = useState(null);
    const [consultingIssue, setConsultingIssue] = useState(null);
    const [aiExplanation, setAiExplanation] = useState({});
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('issues'); // 'issues' or 'contract'
    const [editedClauses, setEditedClauses] = useState({});
    const [copiedIndex, setCopiedIndex] = useState(null);

    // ========== MOCK DATA FOR TESTING ==========
    const USE_MOCK = false; // Set to true for local testing without backend

    const MOCK_ANALYSIS = {
        contractId: 'mock-contract-123',
        fileName: 'חוזה_שכירות_לדוגמה.pdf',
        uploadDate: new Date().toISOString(),
        analysis_result: {
            is_contract: true,
            overall_risk_score: 62,
            score_breakdown: {
                financial_terms: { score: 14, deductions: [{ rule: 'F1', points: -6, reason: 'ערבון גבוה מדי' }] },
                tenant_rights: { score: 12, deductions: [{ rule: 'T1', points: -8, reason: 'חסר התראה לפני כניסה' }] },
                termination_clauses: { score: 16, deductions: [{ rule: 'E1', points: -4, reason: 'תנאי יציאה לא ברורים' }] },
                liability_repairs: { score: 10, deductions: [{ rule: 'L2', points: -10, reason: 'בלאי סביר על השוכר' }] },
                legal_compliance: { score: 10, deductions: [{ rule: 'C3', points: -10, reason: 'ויתור על זכויות סטטוטוריות' }] }
            },
            summary: 'חוזה שכירות בלתי מוגנת לתקופה של 12 חודשים. נמצאו 4 סעיפים לתשומת לב, מתוכם 2 בסיכון גבוה. מומלץ לנהל משא ומתן על סעיפי הקנסות.',
            issues: [
                {
                    rule_id: 'F1',
                    clause_topic: 'קנס איחור בתשלום',
                    original_text: 'במקרה של איחור בתשלום שכר הדירה יחויב השוכר בקנס של 500 ₪ לכל יום איחור ללא הגבלה.',
                    risk_level: 'High',
                    penalty_points: 8,
                    legal_basis: 'חוק שכירות הוגנת 2017 - סעיף 25',
                    explanation: 'קנס איחור של 500 ₪ ליום הוא מוגזם ועלול להיחשב כסעיף מקפח. לפי החוק, קנסות צריכים להיות סבירים ומידתיים.',
                    suggested_fix: 'במקרה של איחור בתשלום שכר הדירה מעל 7 ימים, יחויב השוכר בריבית פיגורים של 2% לחודש, ולא יותר מ-10% מסכום החוב.'
                },
                {
                    rule_id: 'T1',
                    clause_topic: 'כניסה לדירה ללא התראה',
                    original_text: 'המשכיר רשאי להיכנס לדירה בכל עת לצורך בדיקות ותיקונים.',
                    risk_level: 'High',
                    penalty_points: 7,
                    legal_basis: 'זכות הפרטיות - חוק יסוד כבוד האדם וחירותו',
                    explanation: 'כניסה ללא התראה מראש פוגעת בפרטיות השוכר. החוק דורש התראה מראש.',
                    suggested_fix: 'המשכיר רשאי להיכנס לדירה לצורך בדיקות ותיקונים, בתיאום מראש של 48 שעות לפחות, למעט במקרי חירום.'
                },
                {
                    rule_id: 'E1',
                    clause_topic: 'ביטול חוזה מיידי',
                    original_text: 'המשכיר רשאי לבטל את החוזה באופן מיידי וללא התראה אם השוכר הפר תנאי כלשהו.',
                    risk_level: 'Medium',
                    penalty_points: 5,
                    legal_basis: 'חוק שכירות הוגנת 2017 - סעיף 18',
                    explanation: 'ביטול מיידי ללא התראה אינו הוגן. יש לתת לשוכר הזדמנות לתקן הפרות.',
                    suggested_fix: 'המשכיר יהיה רשאי לבטל את החוזה לאחר מתן התראה בכתב של 30 יום, ולאחר שניתנה לשוכר הזדמנות סבירה לתקן את ההפרה.'
                },
                {
                    rule_id: 'L2',
                    clause_topic: 'בלאי סביר',
                    original_text: 'השוכר אחראי לכל נזק לדירה כולל בלאי סביר.',
                    risk_level: 'Low',
                    penalty_points: 3,
                    legal_basis: 'חוק שכירות הוגנת 2017 - סעיף 6',
                    explanation: 'בלאי סביר הוא באחריות המשכיר על פי חוק. סעיף זה מנוגד לחוק.',
                    suggested_fix: 'השוכר אחראי לנזקים שנגרמו באשמתו, למעט בלאי סביר הנובע משימוש רגיל בדירה.'
                }
            ]
        },
        sanitizedText: `חוזה שכירות בלתי מוגנת

1. הצדדים לחוזה
המשכיר: ישראל ישראלי, ת.ז. 123456789
השוכר: יעקב כהן, ת.ז. 987654321

2. תקופת השכירות
תקופת השכירות הינה 12 חודשים, החל מתאריך 01/01/2025 ועד 31/12/2025.

3. דמי שכירות
דמי השכירות החודשיים הינם 5,000 ₪, ישולמו עד ה-5 לכל חודש.

4. קנס איחור בתשלום
במקרה של איחור בתשלום שכר הדירה יחויב השוכר בקנס של 500 ₪ לכל יום איחור ללא הגבלה.

5. כניסה לדירה
המשכיר רשאי להיכנס לדירה בכל עת לצורך בדיקות ותיקונים.

6. ביטול חוזה
המשכיר רשאי לבטל את החוזה באופן מיידי וללא התראה אם השוכר הפר תנאי כלשהו.

7. אחריות לנזקים
השוכר אחראי לכל נזק לדירה כולל בלאי סביר.

8. ערבון
השוכר ישלם ערבון בסך 15,000 ₪ עם חתימת החוזה.

חתימות:
_________________    _________________
    המשכיר              השוכר`
    };
    // ========== END MOCK DATA ==========

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

            // Use mock data for testing
            if (USE_MOCK) {
                console.log('Using MOCK data for testing');
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
                setAnalysis(MOCK_ANALYSIS);
                setError(null);
                return;
            }

            const decodedId = decodeURIComponent(contractId);
            console.log('Fetching analysis for:', decodedId);
            const data = await getAnalysis(decodedId);
            setAnalysis(data);
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
            <div className="analysis-page" dir="rtl">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>טוען תוצאות ניתוח...</p>
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
            <div className="analysis-page" dir={isRTL ? 'rtl' : 'ltr'}>
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
        <div className="analysis-page" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="analysis-header animate-fadeIn">
                <Link to="/contracts" className="back-link">{isRTL ? '→' : '←'} {t('analysis.backToContracts')}</Link>
                <h1>{t('analysis.title')}</h1>
            </div>

            <div className="analysis-layout">
                {/* Sticky Sidebar - Left */}
                <aside className="analysis-sidebar">
                    <Card variant="glass" padding="md" className="sidebar-card">
                        {/* Contract Info */}
                        <div className="contract-details">
                            <div className="contract-file-icon">📄</div>
                            <h3 className="contract-file-name">
                                {analysis?.fileName || (isRTL ? 'מסמך חוזה' : 'Contract Document')}
                            </h3>
                            {analysis?.propertyAddress && (
                                <p className="contract-meta-item">📍 {analysis.propertyAddress}</p>
                            )}
                            {analysis?.landlordName && (
                                <p className="contract-meta-item">👤 {analysis.landlordName}</p>
                            )}
                            {analysis?.uploadDate && (
                                <p className="contract-meta-item">📅 {new Date(analysis.uploadDate).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}</p>
                            )}
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
                        <Card variant="glass" padding="lg" className="no-issues animate-slideUp">
                            <div className="no-issues-content">
                                <span className="no-issues-icon">✅</span>
                                <h3>{t('analysis.noIssues')}</h3>
                                <p>{isRTL ? 'חוזה זה נראה תקין ללא דגלים אדומים משמעותיים.' : 'This contract appears to be in good standing with no significant red flags.'}</p>
                            </div>
                        </Card>
                    )}

                    {/* Full Contract View Tab */}
                    {activeTab === 'contract' && (
                        <ContractView
                            contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                            backendClauses={analysis?.clauses_list || analysis?.clauses || []}
                            issues={issues}
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

