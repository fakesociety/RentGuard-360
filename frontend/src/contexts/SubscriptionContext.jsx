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
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const getUserId = useCallback(() => {
        return user?.userId || user?.username || null;
    }, [user]);

    const refreshSubscription = useCallback(async () => {
        const userId = getUserId();
        if (!userId) return;

        // Admin users always have unlimited access and do not require a bundle.
        if (isAdmin) {
            setSubscription({
                userId,
                packageName: 'Admin',
                scansRemaining: -1,
                isUnlimited: true,
                updatedAt: new Date().toISOString(),
            });
            return;
        }

        setIsLoading(true);
        try {
            const data = await getSubscription(userId);
            setSubscription(data);
        } catch (err) {
            // Gracefully handle: no subscription yet, SQL Server down, or any backend issue.
            // The app should still work — user just won't see subscription data.
            const msg = err.message || '';
            const isExpected = msg.includes('404') || msg.includes('No subscription')
                || msg.includes('SQL Server') || msg.includes('400');
            if (!isExpected) {
                console.error('Failed to fetch subscription:', err);
            }
            setSubscription(null);
        } finally {
            setIsLoading(false);
        }
    }, [getUserId, isAdmin]);

    // Fetch subscription on login
    useEffect(() => {
        if (isAuthenticated) {
            refreshSubscription();
        } else {
            setSubscription(null);
        }
    }, [isAuthenticated, refreshSubscription]);

    const deductScan = async () => {
        const userId = getUserId();
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
            refreshSubscription,
            deductScan,
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

