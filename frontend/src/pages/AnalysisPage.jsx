import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import './AnalysisPage.css';

const AnalysisPage = () => {
    const { contractId } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalysis();
    }, [contractId]);

    const fetchAnalysis = async () => {
        try {
            setIsLoading(true);
            setError('');
            const decodedId = decodeURIComponent(contractId);
            console.log('Fetching analysis for:', decodedId);
            const data = await getAnalysis(decodedId);
            setAnalysis(data);
        } catch (err) {
            console.error('Failed to fetch analysis:', err);
            if (err.message.includes('404')) {
                setError('Analysis not found or still processing. Please wait and try again.');
            } else {
                setError('Failed to load analysis. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getRiskColor = (score) => {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
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
        return (
            <div className="analysis-page">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <h2>Analysis Not Ready</h2>
                    <p>{error}</p>
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

    return (
        <div className="analysis-page">
            <div className="analysis-header animate-fadeIn">
                <Link to="/contracts" className="back-link">← Back to Contracts</Link>
                <h1>Contract Analysis</h1>
                <p className="contract-id">{decodeURIComponent(contractId)}</p>
            </div>

            {/* Risk Score Card */}
            <Card variant="glass" padding="lg" className={`risk-card ${getRiskColor(riskScore)} animate-slideUp`}>
                <div className="risk-content">
                    <div className="risk-score-circle">
                        <span className="score-number">{riskScore}</span>
                        <span className="score-label">Risk Score</span>
                    </div>
                    <div className="risk-details">
                        <h2>Overall Assessment</h2>
                        <p>{result?.summary || 'Analysis complete.'}</p>
                        {result?.is_contract === false && (
                            <div className="not-contract-warning">
                                ⚠️ This document may not be a rental contract
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Issues List */}
            {issues.length > 0 && (
                <section className="issues-section">
                    <h2 className="section-title">Issues Found ({issues.length})</h2>
                    <div className="issues-grid">
                        {issues.map((issue, index) => (
                            <Card
                                key={index}
                                variant="elevated"
                                padding="md"
                                className={`issue-card ${getRiskLabel(issue.risk_level)} animate-slideUp`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="issue-header">
                                    <span className={`issue-badge ${getRiskLabel(issue.risk_level)}`}>
                                        {issue.risk_level}
                                    </span>
                                    <h3>{issue.clause_topic}</h3>
                                </div>

                                {issue.original_text && (
                                    <div className="issue-quote">
                                        <p>"{issue.original_text}"</p>
                                    </div>
                                )}

                                <div className="issue-explanation">
                                    <h4>⚠️ Why This Matters</h4>
                                    <p>{issue.explanation}</p>
                                </div>

                                {issue.negotiation_tip && (
                                    <div className="issue-tip">
                                        <h4>💡 Negotiation Tip</h4>
                                        <p>{issue.negotiation_tip}</p>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {issues.length === 0 && (
                <Card variant="glass" padding="lg" className="no-issues animate-slideUp">
                    <div className="no-issues-content">
                        <span className="no-issues-icon">✅</span>
                        <h3>No Major Issues Found</h3>
                        <p>This contract appears to be standard with no significant red flags.</p>
                    </div>
                </Card>
            )}

            <div className="analysis-actions">
                <Button variant="ghost" onClick={fetchAnalysis}>🔄 Refresh Analysis</Button>
            </div>
        </div>
    );
};

export default AnalysisPage;
