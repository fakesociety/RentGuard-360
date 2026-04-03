import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdminStripeInsights } from '../../hooks/useAdminStripeInsights';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { AdminStripeCards } from './components/AdminStripeCards';
import { AdminStripePanels } from './components/AdminStripePanels';
import { AdminStripeTable } from './components/AdminStripeTable';
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
                        <AdminStripeCards 
                            sql={sql}
                            stripe={stripe}
                            successRate={successRate}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            t={t}
                            formatMoney={formatMoney}
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
                            isRTL={isRTL}
                            formatMoney={formatMoney}
                            localizeBundleName={localizeBundleName}
                        />

                        <AdminStripeTable 
                            data={data}
                            sql={sql}
                            derivedCurrencies={derivedCurrencies}
                            locale={locale}
                            t={t}
                            formatMoney={formatMoney}
                            shortUserId={shortUserId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStripeInsights;
