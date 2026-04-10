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
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getPackageById, createPaymentIntent, confirmPayment } from '@/features/billing/services/stripeApi';
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
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();
    const { user, userAttributes } = useAuth();
    const { refreshSubscription } = useSubscription();

    const [pkg, setPkg] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const userId = userAttributes?.sub || user?.userId || user?.sub || user?.username;
    const userEmail = userAttributes?.email;
    const userName = userAttributes?.name;
    const initRef = useRef(false);

    // Fetch package + create PaymentIntent on mount
    useEffect(() => {
        const initCheckout = async () => {
            if (initRef.current) return;
            initRef.current = true;
            try {
                setIsLoading(true);

                // 1. Get package details
                const packageData = await getPackageById(packageId);
                setPkg(packageData);

                // 2. If free package, handle immediately
                if (packageData.price <= 0) {
                    const result = await createPaymentIntent(userId, parseInt(packageId), userEmail, userName);
                    if (result.isFree) {
                        await refreshSubscription();
                        navigate('/payment-success', {
                            state: { packageName: packageData.name, isFree: true }
                        });
                        return;
                    }
                }

                // 3. Create PaymentIntent for paid packages
                const intentData = await createPaymentIntent(userId, parseInt(packageId), userEmail, userName);
                setClientSecret(intentData.clientSecret);
            } catch (err) {
                console.error('Checkout init error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId && packageId) {
            initCheckout();
        }
    }, [userId, packageId, navigate, refreshSubscription]);

    const handlePaymentSuccess = async (paymentIntent) => {
        setIsLoading(true);
        try {
            // Give Stripe a moment, then confirm with backend manually as a fallback
            // in case the webhook fails or is not configured.
            await confirmPayment(paymentIntent.id);
        } catch (err) {
            console.error('Confirmation fallback error:', err);
            // We ignore errors here since the webhook might have succeeded
        }

        // Refresh subscription to get updated scan count locally
        await refreshSubscription();

        setIsLoading(false);
        navigate('/payment-success', {
            state: {
                packageName: pkg?.name,
                amount: !isRTL ? Math.round(pkg?.price / 3.7) : pkg?.price,
                currency: !isRTL ? '$' : pkg?.currency,
                isFree: false,
            }
        });
    };

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
                    <Button variant="secondary" onClick={() => navigate('/pricing')}>
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
                                        {!isRTL ? '$' : '₪'}{!isRTL ? Math.round(pkg?.price / 3.7) : pkg?.price}
                                    </span>
                                </div>

                                <div className="order-note">
                                    <p className="order-note-title">
                                        {isRTL ? 'מה כלול בתשלום' : 'What is included'}
                                    </p>
                                    <p className="order-note-text">
                                        {isRTL
                                            ? `גישה לחבילת ${pkg?.name ? t(`pricing.${pkg.name.toLowerCase()}`) : ''}, כולל ${pkg?.scanLimit} סריקות.`
                                            : `Access to the ${pkg?.name || ''} bundle, including ${pkg?.scanLimit} contract scans.`}
                                    </p>
                                    <ul className="order-trust-list">
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{isRTL ? 'חיוב מאובטח דרך Stripe' : 'Secure billing via Stripe'}</span>
                                        </li>
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{isRTL ? 'הפעלה מיידית לאחר אישור תשלום' : 'Instant activation after payment confirmation'}</span>
                                        </li>
                                        <li>
                                            <span className="order-trust-dot" aria-hidden="true" />
                                            <span>{isRTL ? 'ללא שמירת פרטי כרטיס אצלנו' : 'No card details stored on our servers'}</span>
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
                                    {isRTL ? 'תשלום מאובטח ומוצפן' : 'Encrypted and secure payment'}
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

