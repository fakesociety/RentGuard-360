import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPackages } from '@/features/billing/services/stripeApi';
import { useSubscription } from '@/contexts/SubscriptionContext';

const FALLBACK_PACKAGES = [
    { id: 'free', name: 'Free', price: 0, scanLimit: 1 },
    { id: 'single', name: 'Single', price: 10, scanLimit: 1 },
    { id: 'basic', name: 'Basic', price: 39, scanLimit: 5 },
    { id: 'pro', name: 'Pro', price: 79, scanLimit: 15 },
];

// Global cache to prevent re-fetching and UI flickering on navigation
let cachedPackagesData = null;

export const usePricing = () => {
    const { 
        subscription, 
        packageName: currentPlan, 
        hasSubscription, 
        isLoading: isSubLoading,
        error: subError
    } = useSubscription();
    
    const navigate = useNavigate();

    const [packages, setPackages] = useState(cachedPackagesData || []);
    const [isLoadingPackages, setIsLoadingPackages] = useState(!cachedPackagesData);
    const [packagesError, setPackagesError] = useState(null);
    
    const currentPackageId = Number(subscription?.packageId ?? subscription?.PackageId ?? 0);

    useEffect(() => {
        if (cachedPackagesData) {
            return; // Already loaded, no need to fetch again
        }

        let isMounted = true;

        const fetchPackages = async () => {
            try {
                if (isMounted) setIsLoadingPackages(true);

                const timeoutPromise = new Promise((_, reject) => {
                    window.setTimeout(() => reject(new Error('Packages request timeout')), 12000);
                });

                const data = await Promise.race([getPackages(), timeoutPromise]);
                if (isMounted) {
                    cachedPackagesData = data;
                    setPackages(data);
                }
            } catch (err) {
                console.warn('Using fallback packages (backend unavailable):', err.message);
                if (isMounted) {
                    // Do not set packagesError here because fallback is an acceptable state
                    cachedPackagesData = FALLBACK_PACKAGES;
                    setPackages(FALLBACK_PACKAGES);
                }
            } finally {
                if (isMounted) setIsLoadingPackages(false);
            }
        };

        fetchPackages();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSelectPackage = (pkg) => {
        navigate(`/checkout/${pkg.id}`);
    };

    return {
        packages,
        isLoading: isLoadingPackages || isSubLoading,
        error: packagesError || subError,
        currentPlan,
        hasSubscription,
        currentPackageId,
        handleSelectPackage,
        subscription
    };
};
