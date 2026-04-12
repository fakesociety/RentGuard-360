/**
 * ============================================
 * Stripe Utils
 * Pure functions for calculating Stripe metrics
 * ============================================
 */

export const calculateSuccessRate = (stripe) => {
    const total = Number(stripe?.chargesLast30Days || 0);
    const successful = Number(stripe?.successfulChargesLast30Days || 0);
    if (!total) return 0;
    return Math.round((successful / total) * 100);
};

export const calculateConversionRate = (stripe) => {
    const intents = Number(stripe?.paymentIntentsLast30Days || 0);
    const successfulCharges = Number(stripe?.successfulChargesLast30Days || 0);
    if (!intents) return 0;
    return Math.round((successfulCharges / intents) * 100);
};

export const calculateDisputeRate = (stripe) => {
    const charges = Number(stripe?.chargesLast30Days || 0);
    if (!charges) return 0;
    return ((Number(stripe?.disputeCountLast30Days || 0) / charges) * 100).toFixed(2);
};

export const calculateRefundRate = (stripe) => {
    const charges = Number(stripe?.chargesLast30Days || 0);
    if (!charges) return 0;
    return ((Number(stripe?.refundedChargesLast30Days || 0) / charges) * 100).toFixed(2);
};

export const calculateDerivedCurrencies = (currencies, sqlTransactions) => {
    if (currencies && currencies.length > 0) {
        return currencies;
    }

    const map = new Map();
    (sqlTransactions || []).forEach((tx) => {
        const code = String(tx.currency || 'N/A').toUpperCase();
        const amount = Number(tx.amount || 0);
        map.set(code, (map.get(code) || 0) + amount);
    });

    return Array.from(map.entries())
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
};

export const calculatePaymentMixRows = (paymentMethods) => {
    const totalMethodCount = Math.max(paymentMethods.reduce((sum, method) => sum + Number(method.count || 0), 0), 1);
    
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
};
