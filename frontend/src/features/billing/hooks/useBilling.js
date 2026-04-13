import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { createCustomerPortalSession, getTransactions } from '@/features/billing/services/stripeApi';
import { emitAppToast } from '@/components/ui/toast/toast';

export const useBilling = () => {
    const { userAttributes, user, isAdmin } = useAuth();
    const { t } = useLanguage();
    const { subscription, isLoading: subLoading, packageName: currentPlan } = useSubscription();

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

    const planName = currentPlan || t('billing.noPlan');
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
        { key: 'last5', label: t('billing.filterLast5') },
        { key: 'all', label: t('billing.filterAllTransactions') },
        { key: 'paid', label: t('billing.filterPaid') },
        { key: 'failed', label: t('billing.filterFailed') },
    ]), [t]);

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

    const handleOpenPortal = async () => {
        setPortalLoading(true);
        setPortalError('');

        try {
            const returnUrl = `${window.location.origin}/#/billing`;
            const response = await createCustomerPortalSession(userId, userEmail, userName, returnUrl);

            if (response?.url) {
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

    return {
        isAdmin,
        subLoading,
        planName,
        scansRemaining,
        isUnlimited,
        portalLoading,
        portalError,
        transactionsLoading,
        transactionsError,
        transactionsFilterOpen,
        transactionsFilter,
        setTransactionsFilterOpen,
        setTransactionsFilter,
        filterMenuRef,
        transactionFilterOptions,
        filteredTransactions,
        handleOpenPortal
    };
};
