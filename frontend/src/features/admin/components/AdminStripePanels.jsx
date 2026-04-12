/**
 * ============================================
 *  AdminStripePanels Component
 *  Detailed panels for Stripe data
 * ============================================
 * 
 * STRUCTURE:
 * - Recent transactions
 * - Subscription status
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import './AdminStripePanels.css';
import { CheckCircle2, XCircle, Activity, ShieldAlert, Percent, Landmark } from 'lucide-react';

export const AdminStripePanels = ({
    sql,
    stripe,
    conversionRate,
    paymentMixRows,
    disputeRate,
    refundRate,
    displayCurrency,
    locale,
    t,
    formatMoney,
    localizeBundleName
}) => {
    return (
        <>
            <section className="stripe-content-grid compact-grid">
                <article className="stripe-panel bundle-panel">
                    <h3>{t('admin.bundleDistribution')}</h3>
                    <div className="bundle-bars">
                        {(sql.bundleBreakdown || []).map((item) => {
                            const max = Math.max(...(sql.bundleBreakdown || []).map((x) => Number(x.count || 0)), 1);
                            const width = Math.max(6, Math.round((Number(item.count || 0) / max) * 100));
                            return (
                                <div className="bundle-row" key={item.name}>
                                    <div className="bundle-row-head">
                                        <span>{localizeBundleName(item.name, item.name, t)}</span>
                                        <span>{item.count}</span>
                                    </div>
                                    <div className="bundle-track">
                                        <div className="bundle-fill" style={{ width: `${width}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!sql.bundleBreakdown || sql.bundleBreakdown.length === 0) && (
                            <p className="empty-text">{t('admin.noData')}</p>
                        )}
                    </div>
                </article>

                <article className="stripe-panel">
                    <h3>{t('admin.stripeFeatures')}</h3>
                    <div className="features-grid">
                        <div className="feature-row">
                            <span>{t('admin.country')}</span>
                            <strong>{stripe.accountCountry || 'N/A'}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.currency')}</span>
                            <strong>{(stripe.defaultCurrency || 'N/A').toUpperCase()}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.chargesEnabled')}</span>
                            <strong className={stripe.chargesEnabled ? 'ok' : 'bad'}>
                                {stripe.chargesEnabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                {stripe.chargesEnabled ? t('admin.enabled') : t('admin.disabled')}
                            </strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.payoutsEnabled')}</span>
                            <strong className={stripe.payoutsEnabled ? 'ok' : 'bad'}>
                                {stripe.payoutsEnabled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                                {stripe.payoutsEnabled ? t('admin.enabled') : t('admin.disabled')}
                            </strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.charges30Days')}</span>
                            <strong>{stripe.chargesLast30Days || 0}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.refundedCharges')}</span>
                            <strong>{stripe.refundedChargesLast30Days || 0}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.refundAmount30Days')}</span>
                            <strong>{formatMoney(stripe.refundedAmountLast30Days, displayCurrency, locale)}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.intents30Days')}</span>
                            <strong>{stripe.paymentIntentsLast30Days || 0}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.pendingBalance')}</span>
                            <strong>{formatMoney(stripe.pendingBalance, displayCurrency, locale)}</strong>
                        </div>
                        <div className="feature-row">
                            <span>{t('admin.intentToChargeConversion')}</span>
                            <strong>{conversionRate}%</strong>
                        </div>
                    </div>
                    {stripe.error ? (
                        <p className="stripe-runtime-error">{t('admin.stripeStatusError')}: {stripe.error}</p>
                    ) : null}
                </article>
            </section>

            <section className="stripe-single-panel stretch-panels">
                <article className="stripe-panel">
                    <h3><Activity size={17} /> {t('admin.paymentMethodMix')}</h3>
                    {paymentMixRows.length > 0 ? (
                        <div className="payment-mix-summary-list">
                            {paymentMixRows.map((row) => (
                                <div className="payment-mix-summary-row" key={`mix-${row.label}`}>
                                    <div className="payment-mix-summary-head">
                                        <span>{row.label || t('common.na')}</span>
                                        <span>{row.count}</span>
                                    </div>
                                    <div className="payment-mix-summary-foot">
                                        <span>{t('admin.transactions')}</span>
                                        <span>{row.percent}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">{t('admin.noPaymentSignals')}</p>
                    )}

                    <div className="stripe-extra-signals">
                        <div className="signal-row">
                            <span><Activity size={14} /> {t('admin.failedCharges30Days')}</span>
                            <strong>{Number(stripe.failedChargesLast30Days || 0)}</strong>
                        </div>
                        <div className="signal-row">
                            <span><ShieldAlert size={14} /> {t('admin.disputeRate')}</span>
                            <strong>{disputeRate}%</strong>
                        </div>
                        <div className="signal-row">
                            <span><Percent size={14} /> {t('admin.refundRate')}</span>
                            <strong>{refundRate}%</strong>
                        </div>
                        <div className="signal-row">
                            <span><Landmark size={14} /> {t('admin.chargesToIntents')}</span>
                            <strong>{stripe.chargesLast30Days || 0}/{stripe.paymentIntentsLast30Days || 0}</strong>
                        </div>
                    </div>
                </article>
            </section>
        </>
    );
};
