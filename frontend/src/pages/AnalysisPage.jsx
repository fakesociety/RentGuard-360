import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis, consultClause, saveEditedContract } from '../services/api';
import { exportToWord, exportToPDF, exportEditedContract } from '../services/ExportService';
import Card from '../components/Card';
import Button from '../components/Button';
import ScoreBreakdown from '../components/ScoreBreakdown';
import ContractView from '../components/ContractView';
import './AnalysisPage.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
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
            <div className="analysis-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading analysis results...</p>
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
            <div className="analysis-page">
                <div className={`error-state error-${error.type}`}>
                    <div className="error-icon">{errorIcon}</div>
                    <h2>{error.title}</h2>
                    <p>{error.message}</p>
                    {error.details && (
                        <details className="error-details">
                            <summary>Technical Details</summary>
                            <pre>{error.details}</pre>
                        </details>
                    )}
                    <div className="error-actions">
                        <Button variant="primary" onClick={fetchAnalysis}>Try Again</Button>
                        <Link to="/contracts">
                            <Button variant="secondary">Back to Contracts</Button>
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
        <div className="analysis-page">
            <div className="analysis-header animate-fadeIn">
                <Link to="/contracts" className="back-link">← Back to Contracts</Link>
                <h1>Contract Analysis</h1>
            </div>

            <div className="analysis-layout">
                {/* Sticky Sidebar - Left */}
                <aside className="analysis-sidebar">
                    <Card variant="glass" padding="md" className="sidebar-card">
                        {/* Contract Info */}
                        <div className="contract-details">
                            <div className="contract-file-icon">📄</div>
                            <h3 className="contract-file-name">
                                {analysis?.fileName || 'Contract Document'}
                            </h3>
                            {analysis?.propertyAddress && (
                                <p className="contract-meta-item">📍 {analysis.propertyAddress}</p>
                            )}
                            {analysis?.landlordName && (
                                <p className="contract-meta-item">👤 {analysis.landlordName}</p>
                            )}
                            {analysis?.uploadDate && (
                                <p className="contract-meta-item">📅 {new Date(analysis.uploadDate).toLocaleDateString()}</p>
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

                        {/* Summary */}
                        <div className="sidebar-summary">
                            <h4>Summary</h4>
                            <p>{result?.summary || 'Analysis complete.'}</p>
                            {result?.is_contract === false && (
                                <div className="not-contract-warning">
                                    ⚠️ This document may not be a rental contract
                                </div>
                            )}
                        </div>

                        <div className="sidebar-divider"></div>

                        {/* Actions */}
                        <div className="sidebar-actions">
                            <button className="sidebar-action-btn" onClick={fetchAnalysis}>
                                🔄 Refresh
                            </button>
                            <div className="export-dropdown-sidebar">
                                <button
                                    className="sidebar-action-btn"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                >
                                    📥 Export Report {showExportMenu ? '▲' : '▼'}
                                </button>
                                {showExportMenu && (
                                    <div className="export-menu-sidebar">
                                        <div className="export-menu-title">Export Analysis Report</div>
                                        <button
                                            onClick={async () => {
                                                setIsExporting(true);
                                                try {
                                                    await exportToWord(analysis, analysis?.fileName || 'Analysis_Report');
                                                } finally {
                                                    setIsExporting(false);
                                                    setShowExportMenu(false);
                                                }
                                            }}
                                            disabled={isExporting}
                                        >
                                            📝 Word - Analysis Report
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsExporting(true);
                                                try {
                                                    await exportToPDF(analysis, analysis?.fileName || 'Analysis_Report');
                                                } finally {
                                                    setIsExporting(false);
                                                    setShowExportMenu(false);
                                                }
                                            }}
                                            disabled={isExporting}
                                        >
                                            📕 PDF - Analysis Report
                                            <span className="export-note">(English only)</span>
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
                            ⚠️ Issues ({issues.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contract')}
                        >
                            📄 Full Contract
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'issues' && issues.length > 0 && (
                        <section className="issues-section">
                            <h2 className="section-title">
                                Issues Found ({issues.length})
                            </h2>
                            <div className="issues-list">
                                {issues.map((issue, index) => (
                                    <Card
                                        key={index}
                                        variant="elevated"
                                        padding="md"
                                        className={`issue-card ${getRiskLabel(issue.risk_level)} animate-slideUp`}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="issue-header" onClick={() => setExpandedIssue(expandedIssue === index ? null : index)}>
                                            <div className="issue-meta">
                                                {issue.rule_id && (
                                                    <span className="issue-rule-id">{issue.rule_id}</span>
                                                )}
                                                <span className={`issue-badge ${getRiskLabel(issue.risk_level)}`}>
                                                    {issue.risk_level}
                                                </span>
                                                {issue.penalty_points && (
                                                    <span className="issue-penalty">-{issue.penalty_points} pts</span>
                                                )}
                                            </div>
                                            <h3>{issue.clause_topic}</h3>
                                            <span className="expand-icon">{expandedIssue === index ? '▲' : '▼'}</span>
                                        </div>

                                        <div className={`issue-content ${expandedIssue === index ? 'expanded' : ''}`}>
                                            {issue.original_text && (
                                                <div className="issue-quote">
                                                    <h4>📝 Original Clause</h4>
                                                    <p>"{issue.original_text}"</p>
                                                </div>
                                            )}

                                            {issue.legal_basis && (
                                                <div className="issue-legal">
                                                    <h4>⚖️ Legal Basis</h4>
                                                    <p>{issue.legal_basis}</p>
                                                </div>
                                            )}

                                            <div className="issue-explanation">
                                                <h4>⚠️ Why This Matters</h4>
                                                <p>{issue.explanation}</p>
                                            </div>

                                            {issue.suggested_fix && (
                                                <div className="issue-suggestion">
                                                    <h4>💡 Suggested Change</h4>
                                                    <p>{issue.suggested_fix}</p>
                                                </div>
                                            )}

                                            {issue.negotiation_tip && (
                                                <div className="issue-tip">
                                                    <h4>🤝 Negotiation Tip</h4>
                                                    <p>{issue.negotiation_tip}</p>
                                                </div>
                                            )}

                                            {/* AI Consult Section */}
                                            <div className="issue-consult">
                                                {aiExplanation[index] ? (
                                                    <div className="ai-response">
                                                        <h4>🤖 AI Explanation</h4>
                                                        <p>{aiExplanation[index]}</p>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleConsultClause(issue, index)}
                                                        loading={consultingIssue === index}
                                                    >
                                                        {consultingIssue === index ? 'Asking AI...' : '🤖 Ask AI for more details'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    {activeTab === 'issues' && issues.length === 0 && (
                        <Card variant="glass" padding="lg" className="no-issues animate-slideUp">
                            <div className="no-issues-content">
                                <span className="no-issues-icon">✅</span>
                                <h3>No Major Issues Found</h3>
                                <p>This contract appears to be standard with no significant red flags.</p>
                            </div>
                        </Card>
                    )}

                    {/* Full Contract View Tab */}
                    {activeTab === 'contract' && (
                        <ContractView
                            contractText={analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || analysis?.extracted_text || ''}
                            issues={issues}
                            onClauseChange={(clauseId, text, action) => {
                                setEditedClauses(prev => ({
                                    ...prev,
                                    [clauseId]: { text, action }
                                }));
                            }}
                            onExportEdited={async (clauses) => {
                                // Export edited contract to Word with Hebrew
                                const contractText = analysis?.sanitizedText || analysis?.full_text || analysis?.contractText || '';
                                await exportEditedContract(contractText, clauses, issues, 'Edited_Contract');
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

