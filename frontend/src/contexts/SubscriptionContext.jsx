/**
 * ============================================
 *  SubscriptionContext
 *  Global State for User's Scan Credits
 * ============================================
 * 
 * STRUCTURE:
 * - Provides scansRemaining, packageName, isUnlimited to all components
 * - refreshSubscription() to refetch from API
 * - deductScan() to deduct + update local state instantly
 * 
 * DEPENDENCIES:
 * - stripeApi.js: getSubscription, deductScan
 * - AuthContext: user identity
 * 
 * ============================================
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from './AuthContext';
import { getSubscription, deductScan as apiDeductScan } from '@/features/billing/services/stripeApi';

const defaultSubscriptionContext = {
    subscription: null,
    scansRemaining: 0,
    isUnlimited: false,
    packageName: null,
    hasSubscription: false,
    isLoading: false,
    error: null,
    refreshSubscription: async () => {},
    deductScan: async () => ({ success: false, error: 'Subscription context unavailable' }),
};

const SubscriptionContext = createContext(defaultSubscriptionContext);

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === defaultSubscriptionContext && import.meta.env.DEV) {
        console.warn('useSubscription fallback is active. Wrap components with SubscriptionProvider to avoid missing subscription state.');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const { user, userAttributes, isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [isLoadingState, setIsLoadingState] = useState(true);
    const [isEntitlementKnownState, setIsEntitlementKnownState] = useState(false);
    const [error, setError] = useState(null);
    const [lastAuthState, setLastAuthState] = useState(isAuthenticated);

    // Sync auth state immediately when it changes to prevent stale reads
    if (isAuthenticated !== lastAuthState) {
        setLastAuthState(isAuthenticated);
        if (isAuthenticated) {
            setIsLoadingState(true);
            setIsEntitlementKnownState(false);
        }
    }

    const isLoading = isAuthLoading || isLoadingState || (isAuthenticated !== lastAuthState);
    const isEntitlementKnown = isEntitlementKnownState && (isAuthenticated === lastAuthState);

    const getUserId = useCallback(async () => {
        // Backend authorization expects Cognito "sub" as the canonical user id.
        if (userAttributes?.sub) {
            return userAttributes.sub;
        }

        try {
            const session = await fetchAuthSession();
            const tokenSub = session?.tokens?.idToken?.payload?.sub;
            if (tokenSub) return tokenSub;
        } catch {
            // Ignore and fall back to user object fields.
        }

        return user?.userId || user?.sub || user?.username || null;
    }, [user, userAttributes]);

    const isNoSubscriptionError = useCallback((error) => {
        const status = Number(error?.status || 0);
        const message = String(error?.message || '').toLowerCase();
        return status === 404 || message.includes('no subscription');
    }, []);

    const refreshSubscription = useCallback(async (silent = false) => {
        if (!isAuthenticated) {
            setSubscription(null);
            if (!silent) setIsLoadingState(false);
            setIsEntitlementKnownState(true);
            return;
        }

        // Critical: set these BEFORE the first await to avoid a one-render redirect race.
        if (!silent) setIsLoadingState(true);
        if (!silent) setIsEntitlementKnownState(false);
        setError(null);

        let hasDefinitiveEntitlement = false;

        try {
            // Admin users always have unlimited access and do not require a bundle.
            if (isAdmin) {
                const adminUserId = await getUserId();
                const adminSubscription = {
                    userId: adminUserId || 'admin',
                    packageName: 'Admin',
                    scansRemaining: -1,
                    isUnlimited: true,
                    updatedAt: new Date().toISOString(),
                };
                setSubscription(adminSubscription);
                hasDefinitiveEntitlement = true;
                return;
            }

            const userId = await getUserId();

            if (!userId) {
                // Never keep the app stuck on loading when user id is temporarily unavailable.
                setSubscription(null);
                hasDefinitiveEntitlement = true;
                return;
            }

            try {
                const data = await getSubscription(userId);
                setSubscription(data);
                hasDefinitiveEntitlement = true;
            } catch (err) {
                if (isNoSubscriptionError(err)) {
                    setSubscription(null);
                    hasDefinitiveEntitlement = true;
                } else {
                    // Fallback to error state to avoid false redirects to pricing when backend is unavailable.
                    setSubscription(null);
                    setError(err.message || 'Failed to fetch subscription');
                    hasDefinitiveEntitlement = true;
                    console.error('Failed to fetch subscription:', err);
                }
            }
        } finally {
            setIsEntitlementKnownState(hasDefinitiveEntitlement);
            setIsLoadingState(false);
        }
    }, [getUserId, isAdmin, isAuthenticated, isNoSubscriptionError]);

    // Fetch subscription on login
    useEffect(() => {
        if (isAuthLoading) return; // Wait for AuthContext to resolve

        if (isAuthenticated) {
            refreshSubscription();
        } else {
            setSubscription(null);
            setError(null);
            setIsLoadingState(false);
            setIsEntitlementKnownState(true);
        }
    }, [isAuthenticated, isAuthLoading, refreshSubscription]);

    const deductScan = async () => {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Not authenticated' };

        try {
            const result = await apiDeductScan(userId);
            // Update local state instantly
            setSubscription(prev => prev ? {
                ...prev,
                scansRemaining: result.isUnlimited ? -1 : result.scansRemaining,
            } : prev);
            return { success: true, scansRemaining: result.scansRemaining };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const scansRemaining = subscription?.scansRemaining ?? 0;
    const isUnlimited = subscription?.isUnlimited || scansRemaining === -1;
    const packageName = subscription?.packageName || null;
    const hasSubscription = subscription !== null;

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            scansRemaining,
            isUnlimited,
            packageName,
            hasSubscription,
            isLoading,
            isEntitlementKnown,
            error,
            refreshSubscription,
            deductScan,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

