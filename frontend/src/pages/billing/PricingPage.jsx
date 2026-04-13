/**
 * ============================================
 *  PricingPage Component
 *  Subscription plan presentation (Netflix-style)
 * ============================================
 * 
 * STRUCTURE:
 * - Free / Single / Basic / Pro packages
 * - Displays active/last purchased bundle
 * - Dynamic conversion to $ for English loc
 * 
 * DEPENDENCIES:
 * - stripeApi (getPackages)
 * - SubscriptionContext
 * ============================================
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { usePricing } from '@/features/billing/hooks/usePricing';
import { getPackageIcon, getPackageFeatures } from '@/features/billing/utils/pricingUtils';
import { calculateDisplayPrice } from '@/utils/formatUtils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import './PricingPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';

const PricingPage = () => {
    const { t, isRTL } = useLanguage();
    
    const {
        packages,
        isLoading,
        error,
        currentPlan,
        hasSubscription,
        currentPackageId,
        handleSelectPackage,
        subscription
    } = usePricing();

    const normalizePlanName = (value) => String(value || '').trim().toLowerCase();

    const getLastPurchaseDateTime = () => {
        const updatedAt = subscription?.updatedAt || subscription?.UpdatedAt;
        if (!updatedAt) {
            return t('pricing.notAvailable');
        }

        const date = new Date(updatedAt);
        if (Number.isNaN(date.getTime())) {
            return t('pricing.notAvailable');
        }

        const locale = isRTL ? 'he-IL' : 'en-US';
        const datePart = date.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
        const timePart = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
        });

        return t('pricing.atTime', { date: datePart, time: timePart });
    };

    if (isLoading) {
        return (
            <div className="pricing-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="pricing-loading">
                    <GlobalSpinner size={30} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pricing-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="pricing-error">
                    <p>{t('common.error')}: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pricing-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Hero Section */}
            <div>
                <section className="pricing-hero animate-fadeIn">
                    <h1 className="pricing-title">{t('pricing.title')}</h1>
                    <p className="pricing-subtitle">{t('pricing.subtitle')}</p>

                    {currentPlan && (
                        <div className="current-plan-banner">
                            <span className="current-plan-label">{t('pricing.lastBundle')}</span>
                            <span className="current-plan-name">{currentPlan}</span>
                            <span className="current-plan-scans">
                                {getLastPurchaseDateTime()}
                            </span>
                        </div>
                    )}
                </section>
            </div>

            {/* Pricing Cards */}
            <div className="pricing-cards-container">
                <section className="pricing-cards-section">
                    <div className="pricing-cards-grid">
                        {(() => {
                            // Show 'Free' only if the user hasn't claimed a subscription yet.
                            // Once they have the Free plan (even with 1 scan left), show 'Single' instead.
                            const isFreeEligible = !hasSubscription;
                            const displayPackages = packages.filter(pkg => {
                                if (pkg.name === 'Free') return isFreeEligible;
                                if (pkg.name === 'Single') return !isFreeEligible;
                                return true;
                            }).sort((a, b) => isRTL ? b.price - a.price : a.price - b.price);

                            return displayPackages.map((pkg, index) => {
                                const byId = currentPackageId > 0 && Number(pkg.id) === currentPackageId;
                                const byName = normalizePlanName(currentPlan) === normalizePlanName(pkg.name);
                                const isCurrentPlan = byId || byName;
                                const isPopular = pkg.name === 'Basic';

                            return (
                                <div
                                    key={pkg.id}
                                    className={`pricing-card-wrapper animate-slideUp ${isPopular ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}`}
                                    style={{ animationDelay: `${index * 150}ms` }}
                                >
                                    {isPopular && (
                                        <div className="popular-badge">
                                            {t('pricing.mostPopular')}
                                        </div>
                                    )}
                                    {isCurrentPlan && (
                                        <div className="current-badge">
                                            {t('pricing.yourPlan')}
                                        </div>
                                    )}

                                    <Card variant="elevated" padding="lg" className="pricing-card">
                                        <div className="pricing-card-header">
                                            <div className={`pricing-icon ${pkg.name.toLowerCase()}`}>
                                                {getPackageIcon(pkg.name)}
                                            </div>
                                            <h3 className="pricing-card-name">{t(`pricing.${pkg.name.toLowerCase()}`)}</h3>
                                            <p className="pricing-card-desc">{t(`pricing.${pkg.name.toLowerCase()}Desc`)}</p>
                                        </div>

                                        <div className="pricing-card-price">
                                            {pkg.price <= 0 ? (
                                                <span className="price-amount free">{t('pricing.free')}</span>
                                            ) : (() => {
                                                const { displayPrice, displayCurrency } = calculateDisplayPrice(pkg.price, isRTL);
                                                return (
                                                    <>
                                                        <span className="price-currency">{displayCurrency}</span>
                                                        <span className="price-amount">{displayPrice}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div className="pricing-card-scans">
                                            <span className={`scan-limit ${pkg.scanLimit === -1 ? 'unlimited' : ''}`}>
                                                {pkg.scanLimit === -1
                                                    ? t('subscription.unlimited')
                                                    : `${pkg.scanLimit} ${t('pricing.scans')}`}
                                            </span>
                                        </div>

                                        <ul className="pricing-features">
                                            {getPackageFeatures(pkg.name, t).map((feature) => (
                                                <li key={feature} className="pricing-feature">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2.5">
                                                        <polyline points="20,6 9,17 4,12" />
                                                    </svg>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="pricing-card-cta">
                                            {isCurrentPlan && pkg.price <= 0 ? (
                                                <Button variant="secondary" fullWidth disabled>
                                                    {t('pricing.currentPlanBtn')}
                                                </Button>
                                            ) : pkg.price <= 0 && currentPlan && currentPlan !== 'Free' ? (
                                                <Button variant="secondary" fullWidth disabled>
                                                    {t('pricing.getStarted')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant={isPopular ? 'primary' : 'ghost'}
                                                    fullWidth
                                                    onClick={() => handleSelectPackage(pkg)}
                                                >
                                                    {pkg.price <= 0 ? t('pricing.getStarted') : (isCurrentPlan ? t('pricing.buyMoreScans') : t('pricing.subscribe'))}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            );
                            });
                        })()}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PricingPage;

