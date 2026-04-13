/**
 * ============================================
 *  AdminStripeInsights
 *  Revenue and Payment Analytics
 * ============================================
 *
 * STRUCTURE:
 * - Core Stripe metrics (MRR, refunds, conversions)
 * - Package distributions
 * - Raw transactions table
 *
 * DEPENDENCIES:
 * - useAdminStripeInsights hook
 * - admin components (AdminStripeCards, AdminStripePanels, AdminStripeTable)
 * ============================================
 */
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminStripeInsights } from '@/features/admin/hooks/useAdminStripeInsights';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { AdminStripeCards } from '@/features/admin/components/AdminStripeCards';
import { AdminStripePanels } from '@/features/admin/components/AdminStripePanels';
import { AdminStripeTable } from '@/features/admin/components/AdminStripeTable';
import './AdminStripeInsightsPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';


const AdminStripeInsights = () => {
    const { isAdmin } = useAuth();
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();

    const {
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
    } = useAdminStripeInsights();

    const locale = isRTL ? 'he-IL' : 'en-US';

    if (!isAdmin) {
        return (
            <div className={`stripe-insights-page`} dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="stripe-insights-denied">
                    <AlertTriangle size={42} />
                    <h2>{t('admin.accessDenied')}</h2>
                    <p>{t('admin.noPermission')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`stripe-insights-page`} dir={isRTL ? 'rtl' : 'ltr'}>
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
                        <GlobalSpinner size={40} />
                    </div>
                ) : (
                    <div className="stats-dashboard stripe-stats-dashboard">
                        <AdminStripeCards
                            sql={sql}
                            stripe={stripe}
                            successRate={successRate}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            t={t}
                        />

                        <AdminStripePanels
                            sql={sql}
                            stripe={stripe}
                            conversionRate={conversionRate}
                            paymentMixRows={paymentMixRows}
                            disputeRate={disputeRate}
                            refundRate={refundRate}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            t={t}
                        />

                        <AdminStripeTable
                            data={data}
                            sql={sql}
                            derivedCurrencies={derivedCurrencies}
                            locale={locale}
                            t={t}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStripeInsights;
