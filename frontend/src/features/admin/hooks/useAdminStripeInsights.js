/**
 * ============================================
 *  useAdminStripeInsights Hook
 *  Fetches and processes Stripe transaction data
 * ============================================
 * 
 * STRUCTURE:
 * - Caches data in sessionStorage
 * - Analyzes success rates, payment mixes, disputes (via stripeUtils)
 * 
 * DEPENDENCIES:
 * - getAdminStripeStats API
 * - stripeUtils (Math logic)
 * ============================================
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { getAdminStripeStats } from '@/features/billing/services/stripeApi';
import {
    calculateSuccessRate,
    calculateConversionRate,
    calculateDisputeRate,
    calculateRefundRate,
    calculateDerivedCurrencies,
    calculatePaymentMixRows
} from '@/features/admin/utils/stripeUtils';

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

const normalizeAdminStatsError = (err, t) => {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('504')) return t('admin.stripeError504');
    if (msg.includes('timeout')) return t('admin.stripeErrorTimeout');
    return err?.message || t('admin.stripeErrorDefault');
};

export const useAdminStripeInsights = () => {
    const { t } = useLanguage();
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
            setError(normalizeAdminStatsError(err, t));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadData(initialHasCacheRef.current);
    }, [loadData]);

    const sql = useMemo(() => data?.sql ?? {}, [data]);
    const stripe = useMemo(() => data?.stripe ?? {}, [data]);

    const successRate = useMemo(() => calculateSuccessRate(stripe), [stripe]);

    const displayCurrency = stripe.defaultCurrency || 'USD';
    const paymentMethods = useMemo(
        () => (Array.isArray(stripe.paymentMethodBreakdown) ? stripe.paymentMethodBreakdown : []),
        [stripe.paymentMethodBreakdown]
    );
    const currencies = useMemo(
        () => (Array.isArray(stripe.currencyBreakdown) ? stripe.currencyBreakdown : []),
        [stripe.currencyBreakdown]
    );
    const conversionRate = useMemo(() => calculateConversionRate(stripe), [stripe]);

    const disputeRate = useMemo(() => calculateDisputeRate(stripe), [stripe]);
    const refundRate = useMemo(() => calculateRefundRate(stripe), [stripe]);

    const derivedCurrencies = useMemo(() =>
        calculateDerivedCurrencies(currencies, sql.recentTransactions),
        [currencies, sql.recentTransactions]);

    const paymentMixRows = useMemo(() => calculatePaymentMixRows(paymentMethods), [paymentMethods]);

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
