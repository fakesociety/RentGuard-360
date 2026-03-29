/**
 * ============================================
 *  PaymentSuccessPage
 *  Post-payment confirmation screen
 * ============================================
 * 
 * STRUCTURE:
 * - Success animation
 * - Order confirmation details
 * - Navigation to dashboard/contracts
 * 
 * DEPENDENCIES:
 * - LanguageContext: translations
 * - React Router: location state for order details
 * 
 * ============================================
 */
import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Card from '../components/Card';
import Button from '../components/Button';
import './PaymentSuccessPage.css';

const PaymentSuccessPage = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // Route Guard: If directly accessed without state, redirect
    if (!location.state) {
        return <Navigate to="/dashboard" replace />;
    }

    const { packageName, amount, currency, isFree } = location.state;

    return (
        <div className="payment-success-page page-container" dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="section-band-alt" style={{ padding: 0, background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <section className="success-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px', width: '100%', maxWidth: '600px' }}>
                    <Card variant="elevated" padding="lg" className="success-card animate-scaleIn" style={{ width: '100%', margin: '0 auto' }}>
                        {/* Success Icon */}
                        <div className="success-icon-wrapper">
                            <div className="success-icon-circle">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="success-title">{t('paymentSuccess.title')}</h1>
                        <p className="success-message" style={{ marginBottom: '24px' }}>
                            {isFree ? t('paymentSuccess.freeActivated') : t('paymentSuccess.paymentCompleted')}
                        </p>

                        {/* Order Details - Forced visible */}
                        <div className="success-details" style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-inset, #F0F2F5)', padding: '24px', borderRadius: '12px', marginBottom: '24px', opacity: 1, visibility: 'visible', width: '100%' }}>
                            <div className="success-detail-item" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span className="detail-label">{t('paymentSuccess.plan') || 'Bundle'}</span>
                                <span className="detail-value">{packageName || (isFree ? 'Free' : 'Premium')}</span>
                            </div>
                            
                            {(!isFree || amount !== undefined) && (
                                <div className="success-detail-item" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span className="detail-label">{t('paymentSuccess.amount') || 'Amount'}</span>
                                    <span className="detail-value">
                                        {isFree ? 'Free' : `${currency === 'ILS' ? '₪' : '$'}${amount || 0}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="success-hint" style={{ marginBottom: '32px', color: 'var(--text-tertiary, #64748B)' }}>
                            {t('paymentSuccess.hint')}
                        </p>

                        {/* Navigation Buttons - Forced visible */}
                        <div className="success-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center', opacity: 1, visibility: 'visible' }}>
                            <Button variant="primary" onClick={() => navigate('/dashboard')} style={{ minWidth: '150px' }}>
                                {t('paymentSuccess.goToDashboard') || 'Go to Dashboard'}
                            </Button>
                            <Button variant="secondary" onClick={() => navigate('/upload')} style={{ minWidth: '150px' }}>
                                {t('paymentSuccess.uploadContract') || 'Upload Contract'}
                            </Button>
                        </div>
                    </Card>
                </section>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
