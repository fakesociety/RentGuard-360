import React from 'react';
import {
    DollarSign,
    Landmark,
    TrendingUp,
    CreditCard,
    BadgeDollarSign,
    ShieldAlert
} from 'lucide-react';

export const AdminStripeCards = ({
    sql,
    stripe,
    successRate,
    displayCurrency,
    locale,
    t,
    formatMoney
}) => {
    return (
        <section className="stripe-kpi-grid">
            <article className="stripe-kpi-card revenue">
                <div className="kpi-icon"><DollarSign size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.revenue')}</p>
                    <p className="kpi-value">{formatMoney(sql.totalRevenue, displayCurrency, locale)}</p>
                </div>
            </article>

            <article className="stripe-kpi-card">
                <div className="kpi-icon"><Landmark size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.availableBalance')}</p>
                    <p className="kpi-value">{formatMoney(stripe.availableBalance, displayCurrency, locale)}</p>
                </div>
            </article>

            <article className="stripe-kpi-card">
                <div className="kpi-icon"><TrendingUp size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.successRate')}</p>
                    <p className="kpi-value">{successRate}%</p>
                </div>
            </article>

            <article className="stripe-kpi-card">
                <div className="kpi-icon"><CreditCard size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.transactions')}</p>
                    <p className="kpi-value">{Number(sql.totalTransactions || 0)}</p>
                </div>
            </article>

            <article className="stripe-kpi-card">
                <div className="kpi-icon"><BadgeDollarSign size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.avgOrderValue')}</p>
                    <p className="kpi-value">{formatMoney(sql.avgOrderValue, displayCurrency, locale)}</p>
                </div>
            </article>

            <article className="stripe-kpi-card">
                <div className="kpi-icon"><ShieldAlert size={20} /></div>
                <div>
                    <p className="kpi-label">{t('admin.disputes30Days')}</p>
                    <p className="kpi-value">{Number(stripe.disputeCountLast30Days || 0)}</p>
                </div>
            </article>
        </section>
    );
};
