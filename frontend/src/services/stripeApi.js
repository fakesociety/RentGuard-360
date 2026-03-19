/**
 * ============================================
 *  Stripe Payment API Service
 *  Connects React to the C# Stripe Payment API
 * ============================================
 * 
 * ENDPOINTS:
 * - GET  /api/packages              - Get all subscription packages
 * - POST /api/payments/create-intent - Create Stripe PaymentIntent
 * - GET  /api/payments/subscription  - Get user's current subscription
 * - GET  /api/payments/transactions  - Get user's payment history
 * - POST /api/payments/deduct        - Deduct one scan credit
 * 
 * DEPENDENCIES:
 * - VITE_STRIPE_API_URL environment variable
 * 
 * ============================================
 */

import { fetchAuthSession } from 'aws-amplify/auth';

// C# Stripe API base URL (separate from the main Node.js API Gateway)
const STRIPE_API_URL = import.meta.env.VITE_STRIPE_API_URL;
if (!STRIPE_API_URL) {
    console.warn('Missing VITE_STRIPE_API_URL. Stripe payment features will not work.');
}

const getAuthToken = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session?.tokens?.idToken?.toString();
        return token || null;
    } catch {
        return null;
    }
};

/**
 * Generic fetch helper for the Stripe API.
 * Auth is required for payment/subscription endpoints.
 */
const stripeApiCall = async (endpoint, options = {}, requiresAuth = false) => {
    const url = `${STRIPE_API_URL}${endpoint}`;
    const token = await getAuthToken();

    if (requiresAuth && !token) {
        throw new Error('Authentication required');
    }

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
};

// ============================================
// PACKAGES
// ============================================

/**
 * Fetch all available subscription packages.
 * GET /api/packages
 */
export const getPackages = async () => {
    return stripeApiCall('/api/packages');
};

/**
 * Fetch a single package by ID.
 * GET /api/packages/{id}
 */
export const getPackageById = async (id) => {
    return stripeApiCall(`/api/packages/${id}`);
};

// ============================================
// PAYMENTS
// ============================================

/**
 * Create a Stripe PaymentIntent for a package purchase.
 * POST /api/payments/create-intent
 */
export const createPaymentIntent = async (userId, packageId) => {
    return stripeApiCall('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ userId, packageId }),
    }, true);
};

/**
 * Confirm a payment manually with the backend (fallback for webhooks).
 * POST /api/payments/create-intent (reuses the endpoint with action='confirm')
 */
export const confirmPayment = async (paymentIntentId) => {
    return stripeApiCall('/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ 
            action: 'confirm', 
            paymentIntentId 
        }),
    }, true);
};

// ============================================
// SUBSCRIPTION
// ============================================

/**
 * Get the user's current subscription and remaining scans.
 * GET /api/payments/subscription?userId=xxx
 */
export const getSubscription = async (userId) => {
    return stripeApiCall(`/api/payments/subscription?userId=${encodeURIComponent(userId)}`, {}, true);
};

// ============================================
// TRANSACTIONS
// ============================================

/**
 * Get the user's payment history.
 * GET /api/payments/transactions?userId=xxx
 */
export const getTransactions = async (userId) => {
    return stripeApiCall(`/api/payments/transactions?userId=${encodeURIComponent(userId)}`, {}, true);
};

// ============================================
// SCAN DEDUCTION
// ============================================

/**
 * Deduct one scan credit from the user's subscription.
 * POST /api/payments/deduct
 */
export const deductScan = async (userId) => {
    return stripeApiCall('/api/payments/deduct', {
        method: 'POST',
        body: JSON.stringify({ userId }),
    }, true);
};

/**
 * Get admin Stripe + SQL billing insights.
 * GET /api/payments/admin-stats
 */
export const getAdminStripeStats = async () => {
    return stripeApiCall('/api/payments/admin-stats', {}, true);
};

export default {
    getPackages,
    getPackageById,
    createPaymentIntent,
    confirmPayment,
    getSubscription,
    getTransactions,
    deductScan,
    getAdminStripeStats,
};
