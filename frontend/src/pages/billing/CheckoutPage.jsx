/**
 * ============================================
 *  CheckoutPage
 *  Stripe Payment Form with Card Element
 * ============================================
 * 
 * STRUCTURE:
 * - Order summary sidebar
 * - Stripe CardElement form
 * - Payment processing state
 * - Error handling
 * 
 * DEPENDENCIES:
 * - @stripe/react-stripe-js: Elements, CardElement
 * - @stripe/stripe-js: loadStripe
 * - stripeApi.js: createPaymentIntent, getPackageById
 * - SubscriptionContext: refreshSubscription
 * 
 * ============================================
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement } from '@stripe/react-stripe-js';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useCheckout } from '@/features/billing/hooks/useCheckout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CheckoutForm from '@/features/billing/components/CheckoutForm';
import './CheckoutPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';

// Initialize Stripe outside component to avoid re-renders
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Main CheckoutPage component
 */
const CheckoutPage = () => {
    const { packageId } = useParams();
    const { t, isRTL } = useLanguage();

    const {
        pkg,
        clientSecret,
        isLoading,
        error,
        displayPrice,
        displayCurrency,
        handlePaymentSuccess,
        handleBackToPricing
    } = useCheckout(packageId);

    if (isLoading) {
        return (
            <div className="checkout-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="checkout-loading">
                    <GlobalSpinner size={30} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="checkout-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="checkout-error-page">
                    <h2>{t('common.error')}</h2>
                    <p>{error}</p>
                    <Button variant="secondary" onClick={handleBackToPricing}>
                        {t('checkout.backToPricing')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <section className="checkout-header animate-fadeIn">
                    <h1 className="checkout-title">{t('checkout.title')}</h1>
                    <Link to="/pricing" className="checkout-back back-button-premium">
                        <span>{t('checkout.backToPricing')}</span>
                        {isRTL ? <ArrowLeft className="arrow" size={20} /> : <ArrowRight className="arrow" size={20} />}
                    </Link>
                </section>

                <section className="checkout-content animate-slideUp">
                    <div className="checkout-grid">
                        {/* Order Summary */}
                        <Card variant="glass" padding="lg" className="order-summary">
                            <h3 className="order-summary-title">{t('checkout.orderSummary')}</h3>
                            <div className="order-details">
                                <div className="order-item">
                                    <span className="order-label">{t('checkout.plan')}</span>
                                    <span className="order-value">{pkg?.name ? t(`pricing.${pkg.name.toLowerCase()}`) : ''}</span>
                                </div>
                                <div className="order-item">
                                    <span className="order-label">{t('checkout.scans')}</span>
                                    <span className="order-value">
                                        {pkg?.scanLimit} {t('pricing.scans')}
                                    </span>
                                </div>
                                <div className="order-divider" />
                                <div className="order-item order-total">
                                    <span className="order-label">{t('checkout.total')}</span>
                                    <span className="order-value">
                                          {displayCurrency}{displayPrice}
                                    </span>
                                </div>
                                <div className="order-note">
                                    <p className="order-note-title">
                                        {t('checkout.includedTitle')}
                                    </p>
                                    <p className="order-note-text">
                                        {t('checkout.includedDesc', { 
                                            plan: pkg?.name ? t(`pricing.${pkg.name.toLowerCase()}`) : '',
                                            scans: pkg?.scanLimit 
                                        })}
                                    </p>
                                    <ul className="order-trust-list">
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{t('checkout.secureBilling')}</span>
                                        </li>
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{t('checkout.instantActivation')}</span>
                                        </li>
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{t('checkout.noCardStored')}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        {/* Payment Form */}
                        <Card variant="elevated" padding="lg" className="payment-form-card">
                            <h3 className="payment-form-title">{t('checkout.paymentMethod')}</h3>
                            <div className="payment-trust-banner" aria-label="Stripe secure payment">
                                <div className="payment-trust-stripe">
                                    <span className="stripe-mark" aria-hidden="true">S</span>
                                    <span className="stripe-wordmark">stripe</span>
                                </div>
                                <span className="payment-trust-text">
                                    {t('checkout.secureEncryption')}
                                </span>
                            </div>
                            {clientSecret && (
                                <Elements stripe={stripePromise} options={{ clientSecret, locale: isRTL ? 'he' : 'en' }}>
                                    <CheckoutForm
                                        pkg={pkg}
                                        clientSecret={clientSecret}
                                        onSuccess={handlePaymentSuccess}
                                    />
                                </Elements>
                            )}
                        </Card>
                    </div>
                </section>
        </div>
    );
};

export default CheckoutPage;

