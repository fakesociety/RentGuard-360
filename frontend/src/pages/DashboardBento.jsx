import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getContracts } from '../services/api';
import {
    Upload, FileText, Shield, AlertTriangle, CheckCircle,
    Clock, TrendingUp, Sparkles, ArrowRight, Zap,
    BarChart3, Activity, ChevronRight
} from 'lucide-react';
import './DashboardBento.css';

/**
 * DashboardBento - Premium Bento Grid Dashboard
 * Silicon Valley SaaS aesthetic inspired by Linear, Raycast, Stripe
 */
const DashboardBento = () => {
    const { userAttributes, user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        analyzed: 0,
        pending: 0,
        highRisk: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

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
                // High Risk = score <= 50 (lower score = higher risk)
                highRisk: contractsList.filter(c => c.status === 'analyzed' && (c.riskScore ?? c.risk_score ?? 100) <= 50).length,
            });

            // Get recent activity (last 3 contracts)
            setRecentActivity(contractsList.slice(0, 3));
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getUserName = () => {
        if (userAttributes?.name) return userAttributes.name;
        if (userAttributes?.email) return userAttributes.email.split('@')[0];
        return 'משתמש';
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    };

    // Mini sparkline data (mock)
    const sparklineData = [3, 5, 4, 7, 6, 8, 7];

    return (
        <div className="bento-dashboard" dir="rtl">
            {/* Bento Grid */}
            <div className="bento-grid">

                {/* Hero Welcome Card - Full Width */}
                <div className="bento-card hero-card">
                    <div className="hero-pattern"></div>
                    <div className="hero-content">
                        <div className="hero-text">
                            <span className="hero-greeting">{getGreeting()}</span>
                            <h1 className="hero-name">{getUserName()}</h1>
                            <p className="hero-subtitle">הנה סיכום הפעילות שלך ב-RentGuard 360</p>
                        </div>
                        <div className="hero-badge">
                            <Sparkles size={14} />
                            <span>Pro Plan</span>
                        </div>
                    </div>
                </div>

                {/* Upload Card - Large Prominent */}
                <div className="bento-card upload-card">
                    <div className="upload-glow"></div>
                    <div className="upload-content">
                        <div className="upload-icon-wrapper">
                            <Upload size={32} strokeWidth={1.5} />
                        </div>
                        <h3>העלאת חוזה חדש</h3>
                        <p>גררו ושחררו קובץ PDF או לחצו לבחירה</p>
                        <Link to="/upload" className="upload-btn">
                            <span>התחלה</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                    <div className="upload-dropzone-hint">
                        <FileText size={16} />
                        <span>PDF עד 25MB</span>
                    </div>
                </div>

                {/* Stats Cards - Micro Cards */}
                <div className="bento-card stat-card">
                    <div className="stat-icon-bg blue">
                        <FileText size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{isLoading ? '–' : stats.total}</span>
                        <span className="stat-label">סה"כ חוזים</span>
                    </div>
                    <div className="stat-sparkline">
                        <svg viewBox="0 0 60 24" className="sparkline-svg">
                            <polyline
                                points={sparklineData.map((v, i) => `${i * 10},${24 - v * 2.5}`).join(' ')}
                                fill="none"
                                stroke="rgba(59, 130, 246, 0.5)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                <div className="bento-card stat-card">
                    <div className="stat-icon-bg green">
                        <CheckCircle size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{isLoading ? '–' : stats.analyzed}</span>
                        <span className="stat-label">נותחו</span>
                    </div>
                    <div className="stat-trend positive">
                        <TrendingUp size={14} />
                        <span>+2 השבוע</span>
                    </div>
                </div>

                <div className="bento-card stat-card">
                    <div className="stat-icon-bg amber">
                        <Clock size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{isLoading ? '–' : stats.pending}</span>
                        <span className="stat-label">ממתינים</span>
                    </div>
                </div>

                <div className="bento-card stat-card alert">
                    <div className="stat-icon-bg red">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{isLoading ? '–' : stats.highRisk}</span>
                        <span className="stat-label">סיכון גבוה</span>
                    </div>
                    {stats.highRisk > 0 && (
                        <div className="stat-alert-badge">
                            <span>דורש תשומת לב</span>
                        </div>
                    )}
                </div>

                {/* Quick Actions Card */}
                <div className="bento-card actions-card">
                    <h3 className="card-title">
                        <Zap size={18} />
                        פעולות מהירות
                    </h3>
                    <div className="quick-actions">
                        <Link to="/contracts" className="quick-action">
                            <div className="action-icon">
                                <FileText size={18} />
                            </div>
                            <span>צפייה בחוזים</span>
                            <ChevronRight size={16} />
                        </Link>
                        <Link to="/upload" className="quick-action">
                            <div className="action-icon">
                                <Upload size={18} />
                            </div>
                            <span>העלאה חדשה</span>
                            <ChevronRight size={16} />
                        </Link>
                        <Link to="/settings" className="quick-action">
                            <div className="action-icon">
                                <Shield size={18} />
                            </div>
                            <span>הגדרות</span>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* Recent Activity Card */}
                <div className="bento-card activity-card">
                    <h3 className="card-title">
                        <Activity size={18} />
                        פעילות אחרונה
                    </h3>
                    <div className="activity-list">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((contract, i) => (
                                <div key={contract.contractId || i} className="activity-item">
                                    <div className={`activity-dot ${contract.status === 'analyzed' ? 'green' : 'amber'}`}></div>
                                    <div className="activity-info">
                                        <span className="activity-name">{contract.fileName || 'חוזה'}</span>
                                        <span className="activity-time">
                                            {contract.status === 'analyzed' ? 'נותח' : 'ממתין'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="activity-empty">
                                <p>אין פעילות אחרונה</p>
                                <Link to="/upload">העלו חוזה ראשון</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pro Tips Card */}
                <div className="bento-card tips-card">
                    <h3 className="card-title">
                        <Sparkles size={18} />
                        טיפים מהירים
                    </h3>
                    <div className="tips-list">
                        <div className="tip-item">
                            <span className="tip-number">1</span>
                            <p>העלו חוזה ברזולוציה גבוהה לתוצאות מדויקות יותר</p>
                        </div>
                        <div className="tip-item">
                            <span className="tip-number">2</span>
                            <p>בדקו את ציון הסיכון לפני חתימה על כל חוזה</p>
                        </div>
                        <div className="tip-item">
                            <span className="tip-number">3</span>
                            <p>השתמשו בהצעות התיקון לשיפור תנאי החוזה</p>
                        </div>
                    </div>
                </div>

                {/* Analytics Preview Card */}
                <div className="bento-card analytics-card">
                    <div className="analytics-header">
                        <h3 className="card-title">
                            <BarChart3 size={18} />
                            סטטיסטיקות
                        </h3>
                        <span className="analytics-period">30 יום אחרונים</span>
                    </div>
                    <div className="analytics-chart">
                        <div className="chart-bars">
                            {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
                                <div
                                    key={i}
                                    className="chart-bar"
                                    style={{ height: `${height}%` }}
                                ></div>
                            ))}
                        </div>
                        <div className="chart-labels">
                            <span>א</span>
                            <span>ב</span>
                            <span>ג</span>
                            <span>ד</span>
                            <span>ה</span>
                            <span>ו</span>
                            <span>ש</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardBento;
