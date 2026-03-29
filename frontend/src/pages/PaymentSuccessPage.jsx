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
        <div className="payment-success-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="section-band-alt success-band">
                <section className="success-content success-content-shell">
                    <Card variant="elevated" padding="lg" className="success-card animate-scaleIn">
                        {/* Success Icon */}
                        <div className="success-icon-wrapper">
                            <div className="success-icon-circle">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="success-title">{t('paymentSuccess.title')}</h1>
                        <p className="success-message">
                            {isFree ? t('paymentSuccess.freeActivated') : t('paymentSuccess.paymentCompleted')}
                        </p>

                        <div className="success-details">
                            <div className="success-detail-item">
                                <span className="detail-label">{t('paymentSuccess.plan') || 'Bundle'}</span>
                                <span className="detail-value">{packageName || (isFree ? 'Free' : 'Premium')}</span>
                            </div>
                            
                            {(!isFree || amount !== undefined) && (
                                <div className="success-detail-item">
                                    <span className="detail-label">{t('paymentSuccess.amount') || 'Amount'}</span>
                                    <span className="detail-value">
                                        {isFree ? 'Free' : `${currency === 'ILS' ? '₪' : '$'}${amount || 0}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="success-hint">
                            {t('paymentSuccess.hint')}
                        </p>

                        <div className="success-actions">
                            <Button variant="primary" onClick={() => navigate('/dashboard')} className="success-action-btn">
                                {t('paymentSuccess.goToDashboard') || 'Go to Dashboard'}
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/upload')} className="success-action-btn">
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
