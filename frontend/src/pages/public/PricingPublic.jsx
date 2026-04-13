/**
 * ============================================
 *  PricingPublic
 *  Public-facing Pricing Page (unauthenticated)
 * ============================================
 *
 * STRUCTURE:
 * - Hero section with page title
 * - 3 pricing cards (Free / Basic / Pro)
 * - Popular badge on Basic
 * - CTA buttons redirect to /?auth=register
 *
 * DEPENDENCIES:
 * - stripeApi.js: getPackages
 * - LanguageContext: translations
 *
 * ============================================
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { usePricing } from '@/features/billing/hooks/usePricing';
import { getPackageIcon, getPackageFeatures } from '@/features/billing/utils/pricingUtils';
import { calculateDisplayPrice } from '@/utils/formatUtils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import '../billing/PricingPage.css';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';

const PricingPublic = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    const { packages, isLoading, error } = usePricing();

    const handleSelectPackage = () => {
        navigate('/?auth=register');
    };

    const normalizePlanName = (value) => String(value || '').trim().toLowerCase();

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
                </section>
            </div>

            {/* Pricing Cards */}
            <div className="pricing-cards-container">
                <section className="pricing-cards-section">
                    <div className="pricing-cards-grid">
                        {packages
                            .filter(pkg => ['free', 'basic', 'pro'].includes(normalizePlanName(pkg.name)))
                            .sort((a, b) => isRTL ? b.price - a.price : a.price - b.price)
                            .map((pkg, index) => {
                                const isPopular = pkg.name === 'Basic';

                                return (
                                    <div
                                        key={pkg.id}
                                        className={`pricing-card-wrapper animate-slideUp ${isPopular ? 'popular' : ''}`}
                                        style={{ animationDelay: `${index * 150}ms` }}
                                    >
                                        {isPopular && (
                                            <div className="popular-badge">
                                                {t('pricing.mostPopular')}
                                            </div>
                                        )}

                                        <Card variant="elevated" padding="lg" className="pricing-card">
                                            <div className="pricing-card-header">
                                                <div className={`pricing-icon ${normalizePlanName(pkg.name)}`}>
                                                    {getPackageIcon(pkg.name)}
                                                </div>
                                                <h3 className="pricing-card-name">{t(`pricing.${normalizePlanName(pkg.name)}`)}</h3>
                                                <p className="pricing-card-desc">{t(`pricing.${normalizePlanName(pkg.name)}Desc`)}</p>
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
                                                {getPackageFeatures(pkg.name, t).map((feature, i) => (
                                                    <li key={i} className="pricing-feature">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2.5">
                                                            <polyline points="20,6 9,17 4,12" />
                                                        </svg>
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            <div className="pricing-card-cta">
                                                <Button
                                                    variant={isPopular ? 'primary' : 'ghost'}
                                                    fullWidth
                                                    onClick={handleSelectPackage}
                                                >
                                                    {pkg.price <= 0 ? t('pricing.getStarted') : t('pricing.subscribe')}
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PricingPublic;

