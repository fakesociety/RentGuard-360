import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContracts } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import './DashboardPage.css';

const DashboardPage = () => {
    const { userAttributes, user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        analyzed: 0,
        pending: 0,
        highRisk: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const userId = user?.userId || user?.username;
            if (!userId) {
                setIsLoading(false);
                return;
            }

            const contracts = await getContracts(userId);
            const contractsList = Array.isArray(contracts) ? contracts : [];

            setStats({
                total: contractsList.length,
                analyzed: contractsList.filter(c => c.status === 'analyzed').length,
                pending: contractsList.filter(c => c.status !== 'analyzed').length,
                highRisk: contractsList.filter(c => c.riskScore >= 70).length,
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getUserName = () => {
        if (userAttributes?.name) return userAttributes.name;
        if (userAttributes?.email) return userAttributes.email.split('@')[0];
        return 'User';
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const statCards = [
        { label: 'Total Contracts', value: stats.total, icon: '📄', color: '#3b82f6' },
        { label: 'Analyzed', value: stats.analyzed, icon: '✅', color: '#10b981' },
        { label: 'Pending', value: stats.pending, icon: '⏳', color: '#f59e0b' },
        { label: 'High Risk', value: stats.highRisk, icon: '⚠️', color: '#ef4444' },
    ];

    return (
        <div className="dashboard-page">
            <section className="welcome-section">
                <h1 className="welcome-title animate-fadeIn">
                    {getGreeting()}, {getUserName()}! 👋
                </h1>
                <p className="welcome-subtitle animate-fadeIn">
                    Welcome to RentGuard 360. Upload and analyze rental contracts with AI.
                </p>
            </section>

            <section className="stats-section">
                <div className="stats-grid">
                    {statCards.map((stat, index) => (
                        <Card
                            key={stat.label}
                            variant="glass"
                            padding="md"
                            className="stat-card animate-slideUp"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                                {stat.icon}
                            </div>
                            <div className="stat-content">
                                <p className="stat-value">{isLoading ? '-' : stat.value}</p>
                                <p className="stat-label">{stat.label}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="actions-section">
                <h2 className="section-title">Quick Actions</h2>
                <div className="actions-grid">
                    <Card variant="elevated" padding="lg" className="action-card animate-slideUp" style={{ animationDelay: '400ms' }}>
                        <div className="action-icon">📤</div>
                        <h3>Upload Contract</h3>
                        <p>Upload a new rental contract for AI analysis</p>
                        <Link to="/upload">
                            <Button variant="primary" fullWidth>Upload PDF</Button>
                        </Link>
                    </Card>

                    <Card variant="elevated" padding="lg" className="action-card animate-slideUp" style={{ animationDelay: '500ms' }}>
                        <div className="action-icon">📋</div>
                        <h3>View Contracts</h3>
                        <p>Browse all your uploaded contracts</p>
                        <Link to="/contracts">
                            <Button variant="secondary" fullWidth>View All</Button>
                        </Link>
                    </Card>
                </div>
            </section>

            <section className="guide-section animate-fadeIn" style={{ animationDelay: '600ms' }}>
                <Card variant="glass" padding="lg" className="guide-card">
                    <h2>Getting Started</h2>
                    <div className="guide-steps">
                        <div className="guide-step">
                            <div className="guide-number">1</div>
                            <div className="guide-content">
                                <h4>Upload a Contract</h4>
                                <p>Drag and drop your rental agreement PDF</p>
                            </div>
                        </div>
                        <div className="guide-step">
                            <div className="guide-number">2</div>
                            <div className="guide-content">
                                <h4>AI Analysis</h4>
                                <p>Our AI will analyze the contract terms (30-60 sec)</p>
                            </div>
                        </div>
                        <div className="guide-step">
                            <div className="guide-number">3</div>
                            <div className="guide-content">
                                <h4>Get Insights</h4>
                                <p>Review risks and negotiation suggestions</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default DashboardPage;
