/**
 * ============================================
 *  PricingPage
 *  Netflix-style Subscription Plans
 * ============================================
 * 
 * STRUCTURE:
 * - Hero section with page title
 * - 3 pricing cards (Free / Basic / Pro)
 * - Current plan indicator
 * - Feature comparison
 * - CTA buttons leading to /checkout/:packageId
 * 
 * DEPENDENCIES:
 * - stripeApi.js: getPackages
 * - SubscriptionContext: current plan
 * - LanguageContext: translations
 * 
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPackages } from '../services/stripeApi';
import Card from '../components/Card';
import Button from '../components/Button';
import './PricingPage.css';

const PricingPage = () => {
    const { t, isRTL } = useLanguage();
    const { subscription, packageName: currentPlan, scansRemaining, hasSubscription } = useSubscription();
    const navigate = useNavigate();

    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentPackageId = Number(subscription?.packageId ?? subscription?.PackageId ?? 0);

    // Hardcoded fallback packages when backend (SQL Server) is unavailable.
    const FALLBACK_PACKAGES = [
        { id: 'free', name: 'Free', price: 0, scanLimit: 1 },
        { id: 'single', name: 'Single', price: 10, scanLimit: 1 },
        { id: 'basic', name: 'Basic', price: 39, scanLimit: 5 },
        { id: 'pro', name: 'Pro', price: 79, scanLimit: 15 },
    ];

    // Fetch packages on mount
    useEffect(() => {
        let isMounted = true;

        const fetchPackages = async () => {
            try {
                if (isMounted) {
                    setIsLoading(true);
                }

                const timeoutPromise = new Promise((_, reject) => {
                    window.setTimeout(() => reject(new Error('Packages request timeout')), 12000);
                });

                const data = await Promise.race([getPackages(), timeoutPromise]);
                if (isMounted) {
                    setPackages(data);
                }
            } catch (err) {
                // If SQL Server is down or any backend error, use fallback packages
                // so the pricing page still renders.
                console.warn('Using fallback packages (backend unavailable):', err.message);
                if (isMounted) {
                    setPackages(FALLBACK_PACKAGES);
                }
                // Don't set error — show the page with fallback data instead.
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchPackages();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSelectPackage = (pkg) => {
        if (pkg.price <= 0) {
            // Free package — navigate to checkout which handles it
            navigate(`/checkout/${pkg.id}`);
        } else {
            navigate(`/checkout/${pkg.id}`);
        }
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
            case 'Single':
                return (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
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
            Single: t('pricing.featuresSingle', { returnObjects: true }),
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

    const getLastPurchaseDateTime = () => {
        const updatedAt = subscription?.updatedAt || subscription?.UpdatedAt;
        if (!updatedAt) {
            return isRTL ? 'לא זמין' : 'N/A';
        }

        const date = new Date(updatedAt);
        if (Number.isNaN(date.getTime())) {
            return isRTL ? 'לא זמין' : 'N/A';
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

        return isRTL ? `${datePart} בשעה ${timePart}` : `${datePart} at ${timePart}`;
    };

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

                    {currentPlan && (
                        <div className="current-plan-banner">
                            <span className="current-plan-label">{isRTL ? 'חבילה אחרונה' : 'Last Bundle'}</span>
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
                            }).sort((a, b) => a.price - b.price);

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
