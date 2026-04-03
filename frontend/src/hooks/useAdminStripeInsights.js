import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getAdminStripeStats } from '../services/stripeApi';

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

export const useAdminStripeInsights = () => {
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

    return {
        data,
        loading,
        error,
        sql,
        stripe,
        successRate,
        displayCurrency,
        conversionRate,
        disputeRate,
        refundRate,
        derivedCurrencies,
        paymentMixRows
    };
};
