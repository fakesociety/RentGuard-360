import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContracts } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import './ContractsPage.css';

const ContractsPage = () => {
    const { user } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchContracts();
    }, [user]);

    const fetchContracts = async () => {
        if (!user?.userId && !user?.username) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const userId = user.userId || user.username;
            console.log('Fetching contracts for user:', userId);
            const data = await getContracts(userId);
            setContracts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contracts:', err);
            setError('Failed to load contracts. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status, riskScore) => {
        if (status === 'analyzed') {
            const color = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
            return <span className={`status-badge ${color}`}>✅ Analyzed</span>;
        }
        if (status === 'processing') {
            return <span className="status-badge processing">⏳ Processing</span>;
        }
        return <span className="status-badge uploaded">📤 Uploaded</span>;
    };

    if (isLoading) {
        return (
            <div className="contracts-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading your contracts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contracts-page">
            <div className="contracts-header animate-fadeIn">
                <div className="header-left">
                    <h1>My Contracts</h1>
                    <p>Manage your uploaded rental contracts</p>
                </div>
                <Link to="/upload">
                    <Button variant="primary">+ Upload New</Button>
                </Link>
            </div>

            {error && <div className="error-message">{error}</div>}

            {contracts.length === 0 ? (
                <Card variant="glass" padding="xl" className="empty-state animate-slideUp">
                    <div className="empty-icon">📁</div>
                    <h2>No Contracts Yet</h2>
                    <p>Upload your first rental contract to get started</p>
                    <Link to="/upload">
                        <Button variant="primary" size="lg">Upload Your First Contract</Button>
                    </Link>
                </Card>
            ) : (
                <div className="contracts-grid">
                    {contracts.map((contract, index) => (
                        <Link
                            key={contract.contractId}
                            to={`/analysis/${encodeURIComponent(contract.contractId)}`}
                            className="contract-link"
                        >
                            <Card
                                variant="elevated"
                                padding="md"
                                hoverable
                                className="contract-card animate-slideUp"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="contract-header">
                                    <div className="contract-icon">📄</div>
                                    {getStatusBadge(contract.status, contract.riskScore)}
                                </div>
                                <div className="contract-info">
                                    <h3>{contract.fileName || 'Contract'}</h3>
                                    <p className="contract-date">
                                        {new Date(contract.uploadDate).toLocaleDateString()}
                                    </p>
                                    {contract.riskScore !== undefined && (
                                        <p className="risk-score">
                                            Risk Score: <strong>{contract.riskScore}</strong>/100
                                        </p>
                                    )}
                                </div>
                                <div className="contract-footer">
                                    <span className="view-action">View Details →</span>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            <Button variant="ghost" onClick={fetchContracts} className="refresh-button">
                🔄 Refresh
            </Button>
        </div>
    );
};

export default ContractsPage;
