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
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import { getPackages } from '../../services/stripeApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import '../billing/PricingPage.css';

const PricingPublic = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hardcoded fallback packages when backend (SQL Server) is unavailable.
    const FALLBACK_PACKAGES = [
        { id: 'free', name: 'Free', price: 0, scanLimit: 1 },
        { id: 'basic', name: 'Basic', price: 39, scanLimit: 5 },
        { id: 'pro', name: 'Pro', price: 79, scanLimit: 15 },
    ];

    // Fetch packages on mount — only show Free / Basic / Pro for public page
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                setIsLoading(true);
                const data = await getPackages();
                if (data && Array.isArray(data) && data.length) {
                    const allowed = new Set(['free', 'basic', 'pro']);
                    const filtered = data.filter((pkg) => {
                        const name = (pkg.name || '').toLowerCase();
                        return allowed.has(name);
                    });
                    setPackages(filtered.length ? filtered : FALLBACK_PACKAGES);
                } else {
                    setPackages(FALLBACK_PACKAGES);
                }
            } catch (err) {
                console.warn('PricingPublic: using fallback packages', err.message);
                setPackages(FALLBACK_PACKAGES);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPackages();
    }, []);

    const handleSelectPackage = () => {
        navigate('/?auth=register');
    };

    const getPackageIcon = (name) => {
        switch (name) {
            case 'Free':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                );
            case 'Basic':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                );
            case 'Pro':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getFeatures = (pkg) => {
        const features = {
            Free: t('pricing.featuresFree', { returnObjects: true }),
            Basic: t('pricing.featuresBasic', { returnObjects: true }),
            Pro: t('pricing.featuresPro', { returnObjects: true }),
        };
        return features[pkg.name] || [];
    };

    const getDisplayPriceAndCurrency = (basePrice) => {
        if (basePrice <= 0) return { price: 0, currency: '' };
        if (isRTL) {
            return { price: basePrice, currency: '₪' };
        }
        // Conversion rate roughly 3.7
        return { price: Math.round(basePrice / 3.7), currency: '$' };
    };

    const normalizePlanName = (value) => String(value || '').trim().toLowerCase();

    if (isLoading) {
        return (
            <div className="pricing-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="pricing-loading">
                    <div className="pricing-spinner" />
                    <p>{t('common.loading')}</p>
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
                            .sort((a, b) => a.price - b.price)
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
                                                    const displayInfo = getDisplayPriceAndCurrency(pkg.price);
                                                    return (
                                                        <>
                                                            <span className="price-currency">{displayInfo.currency}</span>
                                                            <span className="price-amount">{displayInfo.price}</span>
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
                                                {getFeatures(pkg).map((feature, i) => (
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
