/**
 * ============================================
 * BillingPage
 * Stripe Customer Portal – Billing Management
 * ============================================
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    ExternalLink,
    FileText,
    History,
    Shield,
    Lock,
    ArrowLeft,
    ArrowRight,
    Loader2,
    Filter,
    ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { createCustomerPortalSession, getTransactions } from '../services/stripeApi';
import { emitAppToast } from '../utils/toast';
import './BillingPage.css';

const BillingPage = () => {
    const navigate = useNavigate();
    const { userAttributes, user } = useAuth();
    const { t, isRTL } = useLanguage();
    const { subscription, isLoading: subLoading } = useSubscription();

    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [transactionsError, setTransactionsError] = useState('');
    const [transactionsFilterOpen, setTransactionsFilterOpen] = useState(false);
    const [transactionsFilter, setTransactionsFilter] = useState('last5');
    const filterMenuRef = useRef(null);

    const userId = userAttributes?.sub || user?.userId || user?.sub || user?.username;
    const userEmail = userAttributes?.email;
    const userName = userAttributes?.name || '';

    // Subscription info
    const planName = subscription?.packageName || t('billing.noPlan');
    const scansRemaining = subscription?.scansRemaining ?? 0;
    const isUnlimited = subscription?.isUnlimited || scansRemaining === -1;

    useEffect(() => {
        let isCancelled = false;

        const fetchTransactions = async () => {
            if (!userId) return;

            setTransactionsLoading(true);
            setTransactionsError('');

            try {
                const response = await getTransactions(userId);
                const rawTransactions = Array.isArray(response?.transactions) ? response.transactions : [];
                if (!isCancelled) {
                    setTransactions(rawTransactions);
                }
            } catch (err) {
                if (!isCancelled) {
                    setTransactions([]);
                    setTransactionsError(err?.message || t('common.error'));
                }
            } finally {
                if (!isCancelled) {
                    setTransactionsLoading(false);
                }
            }
        };

        fetchTransactions();

        return () => {
            isCancelled = true;
        };
    }, [userId, t]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setTransactionsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const transactionFilterOptions = useMemo(() => ([
        { key: 'last5', label: isRTL ? '5 עסקאות אחרונות' : 'Last 5 transactions' },
        { key: 'all', label: isRTL ? 'כל העסקאות' : 'All transactions' },
        { key: 'paid', label: isRTL ? 'שולם' : 'Paid' },
        { key: 'failed', label: isRTL ? 'נכשל' : 'Failed' },
    ]), [isRTL]);

    const filteredTransactions = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (transactionsFilter === 'last5') {
            return sorted.slice(0, 5);
        }

        if (transactionsFilter === 'all') {
            return sorted;
        }

        return sorted.filter((tx) => {
            const status = String(tx?.status || '').toLowerCase();
            if (transactionsFilter === 'paid') {
                return status === 'succeeded' || status === 'paid';
            }
            if (transactionsFilter === 'failed') {
                return status === 'failed';
            }
            return true;
        });
    }, [transactions, transactionsFilter]);

    const formatAmount = (amount, currency) => {
        let numericAmount = Number(amount || 0);
        const safeCurrency = (currency || 'ILS').toUpperCase();

        // Stripe sends amounts in the smallest currency unit (cents / agorot).
        // Convert to major units only when the value looks like minor units
        // (i.e., an integer >= 100, which would be at least 1.00 in major units).
        if (numericAmount !== 0 && Number.isInteger(numericAmount) && Math.abs(numericAmount) >= 100) {
            numericAmount = numericAmount / 100;
        }

        try {
            return new Intl.NumberFormat(isRTL ? 'he-IL' : 'en-US', {
                style: 'currency',
                currency: safeCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(numericAmount);
        } catch {
            const symbol = safeCurrency === 'ILS' ? '₪' : '$';
            return `${symbol}${numericAmount.toFixed(2)}`;
        }
    };

    const formatDate = (value) => {
        if (!value) return isRTL ? 'לא זמין' : 'N/A';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return isRTL ? 'לא זמין' : 'N/A';

        return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        });
    };

    const handleOpenPortal = async () => {
        setPortalLoading(true);
        setPortalError('');

        try {
            const returnUrl = `${window.location.origin}/billing`;
            const response = await createCustomerPortalSession(userId, userEmail, userName, returnUrl);

            if (response?.url) {
                // Redirect to Stripe Customer Portal
                window.location.href = response.url;
            } else {
                throw new Error('No portal URL returned');
            }
        } catch (err) {
            console.error('Customer Portal error:', err);
            const errorMsg = err.message || t('billing.portalError');
            setPortalError(errorMsg);
            emitAppToast({
                type: 'error',
                title: t('common.error'),
                message: errorMsg,
            });
        } finally {
            setPortalLoading(false);
        }
    };

    const BackArrow = isRTL ? ArrowRight : ArrowLeft;

    return (
        <div className="billing-container" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="billing-header">
                <button className="billing-back-btn" onClick={() => navigate('/settings')}>
                    <BackArrow size={16} />
                    {t('billing.backToSettings')}
                </button>
                <h1 className="billing-title">{t('billing.title')}</h1>
                <p className="billing-subtitle">{t('billing.subtitle')}</p>
            </div>

            <div className="billing-grid">

                {/* Current Plan Card */}
                <div className="billing-card">
                    <div className="plan-card-content">
                        <div className="plan-info">
                            <div className="plan-icon-wrapper">
                                <CreditCard size={24} />
                            </div>
                            <div className="plan-details">
                                <h3>{t('billing.currentPlan')}</h3>
                                <div className="plan-meta">
                                    <span className="plan-badge">{planName}</span>
                                    <span className="plan-scans">
                                        {subLoading
                                            ? '...'
                                            : isUnlimited
                                                ? t('billing.unlimited')
                                                : `${scansRemaining} ${t('billing.scansRemaining')}`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            className="plan-upgrade-btn"
                            onClick={() => navigate('/pricing')}
                        >
                            {t('billing.upgradePlan')}
                        </button>
                    </div>
                </div>

                {/* Stripe Portal Card (Main CTA) */}
                <div className="billing-card portal-card">
                    <div className="portal-card-content">
                        <div className="portal-icon-wrapper">
                            <FileText size={32} />
                        </div>
                        <div className="portal-text">
                            <h3>{t('billing.portalTitle')}</h3>
                            <p>{t('billing.portalDesc')}</p>
                        </div>
                        <button
                            className="portal-btn"
                            onClick={handleOpenPortal}
                            disabled={portalLoading}
                        >
                            {portalLoading ? (
                                <>
                                    <span className="btn-spinner" />
                                    {t('billing.portalLoading')}
                                </>
                            ) : (
                                <>
                                    {t('billing.portalButton')}
                                    <ExternalLink size={18} />
                                </>
                            )}
                        </button>
                        {portalError && (
                            <p className="portal-error-msg">{portalError}</p>
                        )}
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="billing-features">
                    <div className="billing-card billing-feature-card">
                        <div className="feature-icon-wrapper green">
                            <CreditCard size={22} />
                        </div>
                        <h4>{t('billing.feature1Title')}</h4>
                        <p>{t('billing.feature1Desc')}</p>
                    </div>
                    <div className="billing-card billing-feature-card">
                        <div className="feature-icon-wrapper blue">
                            <FileText size={22} />
                        </div>
                        <h4>{t('billing.feature2Title')}</h4>
                        <p>{t('billing.feature2Desc')}</p>
                    </div>
                    <div className="billing-card billing-feature-card">
                        <div className="feature-icon-wrapper purple">
                            <History size={22} />
                        </div>
                        <h4>{t('billing.feature3Title')}</h4>
                        <p>{t('billing.feature3Desc')}</p>
                    </div>
                </div>

                {/* Transactions History */}
                <div className="billing-card transactions-card">
                    <div className="transactions-header">
                        <h3>{isRTL ? 'היסטוריית חיובים' : 'Billing History'}</h3>
                        <div className="billing-transactions-filter-menu" ref={filterMenuRef}>
                            <button
                                type="button"
                                className="billing-transactions-filter-trigger"
                                onClick={() => setTransactionsFilterOpen(prev => !prev)}
                            >
                                <Filter size={14} />
                                <span>
                                    {transactionFilterOptions.find(option => option.key === transactionsFilter)?.label}
                                </span>
                                <ChevronDown size={14} className={`billing-filter-chevron ${transactionsFilterOpen ? 'open' : ''}`} />
                            </button>

                            {transactionsFilterOpen && (
                                <div className="billing-transactions-filter-dropdown">
                                    {transactionFilterOptions.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            className={`billing-transactions-filter-item ${transactionsFilter === option.key ? 'active' : ''}`}
                                            onClick={() => {
                                                setTransactionsFilter(option.key);
                                                setTransactionsFilterOpen(false);
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {transactionsLoading && (
                        <div className="transactions-loading">
                            <Loader2 size={16} className="spin" />
                            <span>{t('common.loading')}</span>
                        </div>
                    )}

                    {!transactionsLoading && transactionsError && (
                        <p className="transactions-error-msg">{transactionsError}</p>
                    )}

                    {!transactionsLoading && !transactionsError && filteredTransactions.length === 0 && (
                        <p className="transactions-empty">
                            {isRTL ? 'לא נמצאו עסקאות עבור הסינון שנבחר.' : 'No transactions found for the selected filter.'}
                        </p>
                    )}

                    {!transactionsLoading && !transactionsError && filteredTransactions.length > 0 && (
                        <div className="transactions-list" role="list">
                            {filteredTransactions.map((tx) => {
                                const key = tx.id || tx.stripePaymentId || `${tx.createdAt}-${tx.amount}`;
                                const status = String(tx.status || '').toLowerCase();

                                return (
                                    <div className={`transaction-row ${isRTL ? 'rtl' : 'ltr'}`} key={key} role="listitem">
                                        <div className="transaction-date">{formatDate(tx.createdAt)}</div>
                                        <div className="transaction-amount">{formatAmount(tx.amount, tx.currency)}</div>
                                        <div className={`transaction-status ${status}`}>
                                            {status === 'succeeded'
                                                ? (isRTL ? 'שולם' : 'Paid')
                                                : status === 'failed'
                                                    ? (isRTL ? 'נכשל' : 'Failed')
                                                    : (tx.status || (isRTL ? 'לא ידוע' : 'Unknown'))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Security Bar */}
                <div className="billing-security-bar">
                    <div className="security-item">
                        <Shield size={16} />
                        <span>{t('billing.poweredByStripe')}</span>
                    </div>
                    <div className="security-item">
                        <Lock size={16} />
                        <span>{t('billing.securityNote')}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BillingPage;
