import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { getContracts } from '../../services/api';
import './DashboardPage.css';

const DashboardPage = () => {
    const { userAttributes, user, isAdmin } = useAuth();
    const { t, isRTL } = useLanguage();
    const { packageName, scansRemaining, isUnlimited, hasSubscription } = useSubscription();

    const [stats, setStats] = useState({
        total: 0,
        analyzed: 0,
        pending: 0,
        highRisk: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const userId = user?.userId || user?.username;
            if (!userId) {
                setIsLoading(false);
                return;
            }

            const contracts = await getContracts(userId);
            const contractsList = Array.isArray(contracts) ? contracts : [];

            const analyzedContracts = contractsList.filter(c => c.status === 'analyzed');
            const highRiskContracts = analyzedContracts.filter(c => {
                const score = c.riskScore ?? c.risk_score ?? 100;
                return score <= 50;
            });

            setStats({
                total: contractsList.length,
                analyzed: analyzedContracts.length,
                pending: contractsList.filter(c => c.status !== 'analyzed' && c.status !== 'failed' && c.status !== 'error').length,
                highRisk: highRiskContracts.length,
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const getUserName = () => {
        if (userAttributes?.name) return userAttributes.name;
        if (userAttributes?.email) return userAttributes.email.split('@')[0];
        return t('common.user');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 21 || hour < 5) return t('dashboard.greeting.night', 'Good night');
        if (hour < 12) return t('dashboard.greeting.morning', 'Good morning');
        if (hour < 17) return t('dashboard.greeting.afternoon', 'Good afternoon');
        return t('dashboard.greeting.evening', 'Good evening');
    };

    const scrollToPageTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    return (
        <div className="dashboard-new-container" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Hero / Circular Status Section */}
            <section className="dashboard-hero-section">
                <div className="dashboard-hero-header">
                    <h2 className="dashboard-greeting">{getGreeting()}, {getUserName()}</h2>
                    <p className="dashboard-subtitle">{t('dashboard.welcomeSubtitle')}</p>
                </div>

                <div className="status-cards-grid">
                    {/* Status Card 1: Total */}
                    <div className="status-card">
                        <div className="status-icon icon-primary">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <span className="status-value text-primary">{isLoading ? '-' : stats.total}</span>
                        <span className="status-label">{t('dashboard.totalContracts')}</span>
                    </div>

                    {/* Status Card 2: Analyzed */}
                    <div className="status-card">
                        <div className="status-icon icon-secondary">
                            <span className="material-symbols-outlined">analytics</span>
                        </div>
                        <span className="status-value text-secondary">{isLoading ? '-' : stats.analyzed}</span>
                        <span className="status-label">{t('dashboard.analyzed')}</span>
                    </div>

                    {/* Status Card 3: Pending */}
                    <div className="status-card">
                        <div className="status-icon icon-tertiary">
                            <span className="material-symbols-outlined">pending_actions</span>
                        </div>
                        <span className="status-value text-tertiary">{isLoading ? '-' : stats.pending}</span>
                        <span className="status-label">{t('dashboard.pending')}</span>
                    </div>

                    {/* Status Card 4: Risks */}
                    <div className="status-card">
                        <div className="status-icon icon-error">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <span className="status-value text-error">{isLoading ? '-' : stats.highRisk}</span>
                        <span className="status-label">{t('dashboard.highRisk')}</span>
                    </div>
                </div>
            </section>

            {/* Wave Divider 1 */}
            <div className="wave-separator">
                <svg className="wave-svg" fill="none" viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 64L60 58.7C120 53 240 43 360 48C480 53 600 75 720 85.3C840 96 960 96 1080 85.3C1200 75 1320 53 1380 42.7L1440 32V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V64Z" className="wave-path-base"></path>
                </svg>
            </div>

            {/* Quick Actions Section */}
            <section className="quick-actions-section">
                <div className="quick-actions-inner">
                    <h2 className="quick-actions-title">
                        {t('dashboard.quickActions')}
                        <span className="title-underline"></span>
                    </h2>

                    <div className="actions-grid-new">

                        <Link to="/contracts" className="action-card-new action-view" onClick={scrollToPageTop}>
                            <div className="action-bg-effect view-effect"></div>
                            <span className="material-symbols-outlined action-large-icon text-primary">folder_open</span>
                            <h3>{t('dashboard.viewContracts')}</h3>
                            <p>{t('dashboard.viewDescription')}</p>
                            <div className="action-link-text text-primary">
                                {t('dashboard.viewAll')} <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                        </Link>

                        <Link to="/upload" className="action-card-new action-upload" onClick={scrollToPageTop}>
                            <div className="action-bg-effect upload-effect"></div>
                            <span className="material-symbols-outlined action-large-icon text-white">cloud_upload</span>
                            <h3 className="text-white">{t('dashboard.uploadContract')}</h3>
                            <p className="text-white-dim">{t('dashboard.uploadDescription')}</p>
                            <div className="action-link-text text-white">
                                {t('dashboard.uploadPDF')} <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                        </Link>

                        {!isAdmin && (
                            <Link to="/pricing" className="action-card-new action-subscription">
                                <div className="action-bg-effect sub-effect"></div>
                                <span className="material-symbols-outlined action-large-icon text-tertiary">card_membership</span>
                                <h3>{t('subscription.myPlan')}</h3>
                                {hasSubscription ? (
                                    <p>{packageName} — {isUnlimited ? t('subscription.unlimited') : `${scansRemaining} ${t('subscription.scansRemaining')}`}</p>
                                ) : (
                                    <p>{t('subscription.noPlan')}</p>
                                )}
                                <div className="action-link-text text-tertiary">
                                    {hasSubscription ? t('subscription.upgrade') : t('subscription.choosePlan')} <span className="material-symbols-outlined">arrow_forward</span>
                                </div>
                            </Link>
                        )}

                        {!isAdmin && (
                            <div className="action-card-new action-coming-soon">
                                <div className="action-bg-effect coming-soon-effect"></div>
                                <span className="material-symbols-outlined action-large-icon text-secondary">rocket_launch</span>
                                <span className="coming-soon-pill">{t('common.comingSoon')}</span>
                                <h3>{t('dashboard.newFeaturesTitle')}</h3>
                                <p>{t('dashboard.newFeaturesDesc')}</p>
                                <div className="action-link-text text-secondary">{t('common.comingSoon')}</div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Wave Divider 2 */}
            <div className="wave-separator reverse-wave">
                <svg className="wave-svg" fill="none" viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0 64L60 58.7C120 53 240 43 360 48C480 53 600 75 720 85.3C840 96 960 96 1080 85.3C1200 75 1320 53 1380 42.7L1440 32V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V64Z" className="wave-path-base"></path>
                </svg>
            </div>

            {/* How to Start Section */}
            <section className="how-to-start-section">
                <div className="how-to-inner">
                    <div className="how-to-header">
                        <h2>{t('dashboard.howToStart')}</h2>
                    </div>

                    <div className="steps-timeline">
                        <div className="step-item">
                            <div className="step-number text-primary">1</div>
                            <h4>{t('dashboard.step1Title')}</h4>
                            <p>{t('dashboard.step1Desc')}</p>
                        </div>

                        <div className="step-item">
                            <div className="step-line"></div>
                            <div className="step-number text-primary">2</div>
                            <h4>{t('dashboard.step2Title')}</h4>
                            <p>{t('dashboard.step2Desc')}</p>
                        </div>

                        <div className="step-item">
                            <div className="step-line"></div>
                            <div className="step-number text-primary">3</div>
                            <h4>{t('dashboard.step3Title')}</h4>
                            <p>{t('dashboard.step3Desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Asymmetrical Curved Wave Divider */}
            <div className="wave-separator dark-wave-top relative-z10">
                <svg className="wave-svg" fill="none" viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="wave-path-dark"></path>
                </svg>
            </div>

            <section className="why-rentguard-section">
                <div className="why-inner">
                    <div className="why-grid">

                        <div className="why-image-wrapper">
                            <div className="why-image-container">
                                <div className="image-overlay"></div>
                                <img src="/lawyer-hero.jpg" alt="Your Legal Consultant" />
                            </div>
                        </div>

                        <div className="why-content">
                            <h2>{t('dashboard.whyUs')}</h2>
                            <p className="why-subtitle text-primary-light-dim">{t('dashboard.whyUsSubtitle')}</p>

                            <div className="why-features-list">
                                {/* 1. Privacy */}
                                <div className="why-feature">
                                    <div className="why-feature-icon">
                                        <span className="material-symbols-outlined">lock</span>
                                    </div>
                                    <div className="why-feature-text">
                                        <h5>{t('dashboard.featurePrivacy')}</h5>
                                        <p className="text-primary-light-dim">{t('dashboard.featurePrivacyDesc')}</p>
                                    </div>
                                </div>

                                {/* 2. Legal Professionalism */}
                                <div className="why-feature">
                                    <div className="why-feature-icon">
                                        <span className="material-symbols-outlined">verified</span>
                                    </div>
                                    <div className="why-feature-text">
                                        <h5>{t('dashboard.featurePrompt')}</h5>
                                        <p className="text-primary-light-dim">{t('dashboard.featurePromptDesc')}</p>
                                    </div>
                                </div>

                                {/* 3. Risk Score (Updated Icon name) */}
                                <div className="why-feature">
                                    <div className="why-feature-icon">
                                        <span className="material-symbols-outlined">query_stats</span>
                                    </div>
                                    <div className="why-feature-text">
                                        <h5>{t('dashboard.featureScore')}</h5>
                                        <p className="text-primary-light-dim">{t('dashboard.featureScoreDesc')}</p>
                                    </div>
                                </div>

                                {/* 4. Negotiation Tips (NEW - matching screenshot) */}
                                <div className="why-feature">
                                    <div className="why-feature-icon">
                                        <span className="material-symbols-outlined">lightbulb</span>
                                    </div>
                                    <div className="why-feature-text">
                                        <h5>{t('dashboard.featureTips')}</h5>
                                        <p className="text-primary-light-dim">{t('dashboard.featureTipsDesc')}</p>
                                    </div>
                                </div>

                                {/* 5. AWS Infrastructure */}
                                <div className="why-feature">
                                    <div className="why-feature-icon">
                                        <span className="material-symbols-outlined">cloud</span>
                                    </div>
                                    <div className="why-feature-text">
                                        <h5>{t('dashboard.featureAws')}</h5>
                                        <p className="text-primary-light-dim">{t('dashboard.featureAwsDesc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardPage;
