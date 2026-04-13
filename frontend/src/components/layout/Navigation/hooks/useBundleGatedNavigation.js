import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { showAppToast } from '@/components/ui/toast/toast';

export const useBundleGatedNavigation = (isAuthenticated, isAdmin, hasSubscription, closeMenus) => {
    const { t } = useLanguage();

    /**
     * Bundle Gating Logic:
     * Intercepts navigation attempts to premium routes. If an authenticated, non-admin user
     * lacks a subscription, the navigation event is cancelled and a warning toast is shown.
     */
    const handleBundleGatedNavigation = (event, path) => {
        const blockedPaths = ['/dashboard', '/upload', '/contracts', '/settings'];
        if (isAuthenticated && !isAdmin && !hasSubscription && blockedPaths.includes(path)) {
            event.preventDefault();
            
            if (closeMenus) {
                closeMenus();
            }
            
            showAppToast({
                type: 'warning',
                title: t('notifications.bundleRequiredTitle'),
                message: t('notifications.bundleRequiredMessage'),
                duration: 5200,
            });
        }
    };

    return handleBundleGatedNavigation;
};
