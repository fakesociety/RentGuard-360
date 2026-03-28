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
import { getSubscription, deductScan as apiDeductScan } from '../services/stripeApi';

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const { user, userAttributes, isAuthenticated, isAdmin } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEntitlementKnown, setIsEntitlementKnown] = useState(false);

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

    const refreshSubscription = useCallback(async () => {
        if (!isAuthenticated) {
            setSubscription(null);
            setIsLoading(false);
            setIsEntitlementKnown(true);
            return;
        }

        // Critical: set these BEFORE the first await to avoid a one-render redirect race.
        setIsLoading(true);
        setIsEntitlementKnown(false);

        let hasDefinitiveEntitlement = false;

        const userId = await getUserId();

        if (!userId) {
            // On hard refresh, auth may be resolved before full user payload is ready.
            // Keep loading here to avoid false redirects until user id is available.
            return;
        }

        // Admin users always have unlimited access and do not require a bundle.
        if (isAdmin) {
            const adminSubscription = {
                userId,
                packageName: 'Admin',
                scansRemaining: -1,
                isUnlimited: true,
                updatedAt: new Date().toISOString(),
            };
            setSubscription(adminSubscription);
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
                // Keep entitlement unknown on transient/backend failures.
                console.error('Failed to fetch subscription:', err);
            }
        } finally {
            setIsEntitlementKnown(hasDefinitiveEntitlement);
            setIsLoading(false);
        }
    }, [getUserId, isAdmin, isAuthenticated, isNoSubscriptionError]);

    // Fetch subscription on login
    useEffect(() => {
        if (isAuthenticated) {
            refreshSubscription();
        } else {
            setSubscription(null);
            setIsLoading(false);
            setIsEntitlementKnown(true);
        }
    }, [isAuthenticated, refreshSubscription]);

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
            refreshSubscription,
            deductScan,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

