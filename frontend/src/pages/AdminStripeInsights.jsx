import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAdminStripeStats } from '../services/stripeApi';
import {
    AlertTriangle,
    CreditCard,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Landmark,
    BadgeDollarSign,
    Activity,
    Percent,
} from 'lucide-react';
import './AdminStripeInsights.css';

const formatMoney = (value, currency = 'USD', locale = 'en-US') => {
    const safe = Number(value || 0);
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: String(currency || 'USD').toUpperCase(),
            maximumFractionDigits: 2,
        }).format(safe);
    } catch {
        return `${safe.toFixed(2)} ${String(currency || 'USD').toUpperCase()}`;
    }
};

const shortUserId = (value) => {
    const text = String(value || '');
    if (text.length <= 12) return text;
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
};

const localizeBundleName = (name, isRTL) => {
    const raw = String(name || '').trim();
    if (!isRTL) return raw;

    const key = raw.toLowerCase();
    if (key === 'basic') return 'בסיס';
    if (key === 'free') return 'חינם';
    if (key === 'single') return 'חד פעמית';
    if (key === 'pro') return 'פרו';
    return raw;
};

const CACHE_KEY = 'rg_admin_stripe_stats';

const getCachedStats = () => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const withTimeout = (promise, timeoutMs = 9000) => new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    promise
        .then((value) => {
            clearTimeout(id);
            resolve(value);
        })
        .catch((error) => {
            clearTimeout(id);
            reject(error);
        });
});

const normalizeAdminStatsError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('504')) return 'Stripe service זמנית לא זמין (504).';
    if (msg.includes('timeout')) return 'טעינת Stripe התעכבה. נסה שוב בעוד רגע.';
    return err?.message || 'שגיאה בטעינת נתוני Stripe';
};

const AdminStripeInsights = () => {
    const { isAdmin } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();

    const [data, setData] = useState(() => getCachedStats());
    const [loading, setLoading] = useState(() => !getCachedStats());
    const [error, setError] = useState('');
    const initialHasCacheRef = useRef(Boolean(getCachedStats()));

    const loadData = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        setError('');

        try {
            const result = await withTimeout(getAdminStripeStats(), 9000);
            setData(result);
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
            } catch {
                // ignore cache write errors
            }
        } catch (err) {
            setError(normalizeAdminStatsError(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(initialHasCacheRef.current);
    }, [loadData]);

    const sql = useMemo(() => data?.sql ?? {}, [data]);
    const stripe = useMemo(() => data?.stripe ?? {}, [data]);

    const successRate = useMemo(() => {
        const total = Number(stripe.chargesLast30Days || 0);
        const successful = Number(stripe.successfulChargesLast30Days || 0);
        if (!total) return 0;
        return Math.round((successful / total) * 100);
    }, [stripe]);

    const locale = isRTL ? 'he-IL' : 'en-US';
    const displayCurrency = stripe.defaultCurrency || 'USD';
    const paymentMethods = useMemo(
        () => (Array.isArray(stripe.paymentMethodBreakdown) ? stripe.paymentMethodBreakdown : []),
        [stripe.paymentMethodBreakdown]
    );
    const currencies = useMemo(
        () => (Array.isArray(stripe.currencyBreakdown) ? stripe.currencyBreakdown : []),
        [stripe.currencyBreakdown]
    );
    const conversionRate = useMemo(() => {
        const intents = Number(stripe.paymentIntentsLast30Days || 0);
        const successfulCharges = Number(stripe.successfulChargesLast30Days || 0);
        if (!intents) return 0;
        return Math.round((successfulCharges / intents) * 100);
    }, [stripe]);

    const totalMethodCount = Math.max(paymentMethods.reduce((sum, method) => sum + Number(method.count || 0), 0), 1);
    const disputeRate = useMemo(() => {
        const charges = Number(stripe.chargesLast30Days || 0);
        if (!charges) return 0;
        return ((Number(stripe.disputeCountLast30Days || 0) / charges) * 100).toFixed(2);
    }, [stripe]);
    const refundRate = useMemo(() => {
        const charges = Number(stripe.chargesLast30Days || 0);
        if (!charges) return 0;
        return ((Number(stripe.refundedChargesLast30Days || 0) / charges) * 100).toFixed(2);
    }, [stripe]);
    const derivedCurrencies = useMemo(() => {
        if (currencies.length > 0) {
            return currencies;
        }

        const map = new Map();
        (sql.recentTransactions || []).forEach((tx) => {
            const code = String(tx.currency || 'N/A').toUpperCase();
            const amount = Number(tx.amount || 0);
            map.set(code, (map.get(code) || 0) + amount);
        });

        return Array.from(map.entries())
            .map(([currency, amount]) => ({ currency, amount }))
            .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    }, [currencies, sql.recentTransactions]);

    const paymentMixRows = useMemo(() => {
        return paymentMethods
            .slice()
            .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
            .map((method) => {
                const key = String(method.method || 'unknown').toLowerCase();
                const value = Number(method.count || 0);
                const percent = Math.round((value / totalMethodCount) * 100);

                return {
                    label: key.replace(/_/g, ' '),
                    percent,
                    count: value,
                };
            });
    }, [paymentMethods, totalMethodCount]);

    if (!isAdmin) {
        return (
            <div className={`stripe-insights-page page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="stripe-insights-denied">
                    <AlertTriangle size={42} />
                    <h2>{t('admin.accessDenied')}</h2>
                    <p>{t('admin.noPermission')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-dashboard stripe-insights-page page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header stripe-header-row">
                <div>
                    <h1>
                        <CreditCard size={28} style={{ marginInlineEnd: '12px' }} />
                        {t('admin.stripeInsightsTitle')}
                    </h1>
                    <p>{t('admin.stripeInsightsSubtitle')}</p>
                </div>
            </header>

            <div className="admin-content">
                {error && (
                    <div className="error-banner stripe-insights-error">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="loading-state stripe-insights-loading">
                        <div className="loading-spinner"></div>
                        <p>{t('common.loading')}</p>
                    </div>
                ) : (
                    <div className="stats-dashboard stripe-stats-dashboard">
                        <section className="stripe-kpi-grid">
                            <article className="stripe-kpi-card revenue">
                            <div className="kpi-icon"><DollarSign size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.revenue')}</p>
                                <p className="kpi-value">{formatMoney(sql.totalRevenue, displayCurrency, locale)}</p>
                            </div>
                        </article>

                        <article className="stripe-kpi-card">
                            <div className="kpi-icon"><Landmark size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.availableBalance')}</p>
                                <p className="kpi-value">{formatMoney(stripe.availableBalance, displayCurrency, locale)}</p>
                            </div>
                        </article>

                        <article className="stripe-kpi-card">
                            <div className="kpi-icon"><TrendingUp size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.successRate')}</p>
                                <p className="kpi-value">{successRate}%</p>
                            </div>
                        </article>

                        <article className="stripe-kpi-card">
                            <div className="kpi-icon"><CreditCard size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.transactions')}</p>
                                <p className="kpi-value">{Number(sql.totalTransactions || 0)}</p>
                            </div>
                        </article>

                        <article className="stripe-kpi-card">
                            <div className="kpi-icon"><BadgeDollarSign size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.avgOrderValue')}</p>
                                <p className="kpi-value">{formatMoney(sql.avgOrderValue, displayCurrency, locale)}</p>
                            </div>
                        </article>

                        <article className="stripe-kpi-card">
                            <div className="kpi-icon"><ShieldAlert size={20} /></div>
                            <div>
                                <p className="kpi-label">{t('admin.disputes30Days')}</p>
                                <p className="kpi-value">{Number(stripe.disputeCountLast30Days || 0)}</p>
                            </div>
                        </article>
                        </section>

                        <section className="stripe-content-grid compact-grid">
                            <article className="stripe-panel bundle-panel">
                                <h3>{t('admin.bundleDistribution')}</h3>
                                <div className="bundle-bars">
                                    {(sql.bundleBreakdown || []).map((item) => {
                                    const max = Math.max(...(sql.bundleBreakdown || []).map((x) => Number(x.count || 0)), 1);
                                    const width = Math.max(6, Math.round((Number(item.count || 0) / max) * 100));
                                    return (
                                        <div className="bundle-row" key={item.name}>
                                            <div className="bundle-row-head">
                                                <span>{localizeBundleName(item.name, isRTL)}</span>
                                                <span>{item.count}</span>
                                            </div>
                                            <div className="bundle-track">
                                                <div className="bundle-fill" style={{ width: `${width}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                    {(!sql.bundleBreakdown || sql.bundleBreakdown.length === 0) && (
                                        <p className="empty-text">{t('admin.noData')}</p>
                                    )}
                                </div>
                            </article>

                            <article className="stripe-panel">
                                <h3>{t('admin.stripeFeatures')}</h3>
                                <div className="features-grid">
                                    <div className="feature-row">
                                        <span>{t('admin.country')}</span>
                                        <strong>{stripe.accountCountry || 'N/A'}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.currency')}</span>
                                        <strong>{(stripe.defaultCurrency || 'N/A').toUpperCase()}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.chargesEnabled')}</span>
                                        <strong className={stripe.chargesEnabled ? 'ok' : 'bad'}>
                                            {stripe.chargesEnabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                            {stripe.chargesEnabled ? t('admin.enabled') : t('admin.disabled')}
                                        </strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.payoutsEnabled')}</span>
                                        <strong className={stripe.payoutsEnabled ? 'ok' : 'bad'}>
                                            {stripe.payoutsEnabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                            {stripe.payoutsEnabled ? t('admin.enabled') : t('admin.disabled')}
                                        </strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.charges30Days')}</span>
                                        <strong>{stripe.chargesLast30Days || 0}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.refundedCharges')}</span>
                                        <strong>{stripe.refundedChargesLast30Days || 0}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.refundAmount30Days')}</span>
                                        <strong>{formatMoney(stripe.refundedAmountLast30Days, displayCurrency, locale)}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.intents30Days')}</span>
                                        <strong>{stripe.paymentIntentsLast30Days || 0}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.pendingBalance')}</span>
                                        <strong>{formatMoney(stripe.pendingBalance, displayCurrency, locale)}</strong>
                                    </div>
                                    <div className="feature-row">
                                        <span>{t('admin.intentToChargeConversion')}</span>
                                        <strong>{conversionRate}%</strong>
                                    </div>
                                </div>
                                {stripe.error ? (
                                    <p className="stripe-runtime-error">{t('admin.stripeStatusError')}: {stripe.error}</p>
                                ) : null}
                            </article>
                        </section>

                        <section className="stripe-single-panel stretch-panels">
                            <article className="stripe-panel">
                                <h3><Activity size={17} /> {t('admin.paymentMethodMix')}</h3>
                                {paymentMixRows.length > 0 ? (
                                    <div className="payment-mix-summary-list">
                                        {paymentMixRows.map((row) => (
                                            <div className="payment-mix-summary-row" key={`mix-${row.label}`}>
                                                <div className="payment-mix-summary-head">
                                                    <span>{row.label || t('common.na')}</span>
                                                    <span>{row.count}</span>
                                                </div>
                                                <div className="payment-mix-summary-foot">
                                                    <span>{t('admin.transactions')}</span>
                                                    <span>{row.percent}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-text">{t('admin.noPaymentSignals')}</p>
                                )}

                                <div className="stripe-extra-signals">
                                    <div className="signal-row">
                                        <span><Activity size={14} /> {t('admin.failedCharges30Days')}</span>
                                        <strong>{Number(stripe.failedChargesLast30Days || 0)}</strong>
                                    </div>
                                    <div className="signal-row">
                                        <span><ShieldAlert size={14} /> {t('admin.disputeRate')}</span>
                                        <strong>{disputeRate}%</strong>
                                    </div>
                                    <div className="signal-row">
                                        <span><Percent size={14} /> {t('admin.refundRate')}</span>
                                        <strong>{refundRate}%</strong>
                                    </div>
                                    <div className="signal-row">
                                        <span><Landmark size={14} /> {t('admin.chargesToIntents')}</span>
                                        <strong>{stripe.chargesLast30Days || 0}/{stripe.paymentIntentsLast30Days || 0}</strong>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <section className="stripe-panel table-panel">
                            <div className="table-head">
                                <h3>{t('admin.recentTransactions')}</h3>
                                <span>{t('admin.generatedAt')}: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString(locale) : 'N/A'}</span>
                            </div>
                            <div className="currency-summary">
                                <h4>{t('admin.topCurrencies')}</h4>
                                {derivedCurrencies.length > 0 ? (
                                    <div className="currency-summary-list">
                                        {derivedCurrencies.slice(0, 6).map((cur) => (
                                            <div className="currency-summary-row" key={`currency-${cur.currency}`}>
                                                <span>{String(cur.currency || '').toUpperCase()}</span>
                                                <strong>{formatMoney(cur.amount, cur.currency, locale)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="empty-text">{t('admin.noCurrencyAmounts')}</p>
                                )}
                            </div>
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('common.user')}</th>
                                            <th>{t('admin.bundle')}</th>
                                            <th>{t('admin.amount')}</th>
                                            <th>{t('admin.currency')}</th>
                                            <th>{t('admin.status')}</th>
                                            <th>{t('admin.updatedAt')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sql.recentTransactions || []).map((tx, idx) => (
                                            <tr key={`${tx.userId}-${tx.createdAt}-${idx}`}>
                                                <td>{shortUserId(tx.userId)}</td>
                                                <td>{tx.bundleName}</td>
                                                <td>{Number(tx.amount || 0).toFixed(2)}</td>
                                                <td>{String(tx.currency || '').toUpperCase()}</td>
                                                <td>
                                                    <span className={`status-pill ${String(tx.status || '').toLowerCase()}`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleString(locale) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!sql.recentTransactions || sql.recentTransactions.length === 0) && (
                                    <p className="empty-text">{t('admin.noData')}</p>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStripeInsights;
