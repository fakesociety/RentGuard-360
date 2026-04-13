import { useState, useEffect } from 'react';

export const useCompactNavPrefs = () => {
    const MOBILE_NAV_COMPACT_PREF_KEY = 'rentguard_mobile_nav_compact';
    
    const [compactMobileNavEnabled, setCompactMobileNavEnabled] = useState(() => {
        try {
            return localStorage.getItem(MOBILE_NAV_COMPACT_PREF_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Sync mobile navigation compact mode across browser tabs
    useEffect(() => {
        const updateCompactMode = () => {
            try {
                setCompactMobileNavEnabled(localStorage.getItem(MOBILE_NAV_COMPACT_PREF_KEY) === 'true');
            } catch {
                setCompactMobileNavEnabled(false);
            }
        };

        const onCustomToggle = (event) => {
            if (typeof event?.detail?.enabled === 'boolean') {
                setCompactMobileNavEnabled(event.detail.enabled);
                return;
            }
            updateCompactMode();
        };

        const onStorage = (event) => {
            if (event.key && event.key !== MOBILE_NAV_COMPACT_PREF_KEY) return;
            updateCompactMode();
        };

        window.addEventListener('rg:mobile-nav-compact-changed', onCustomToggle);
        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('rg:mobile-nav-compact-changed', onCustomToggle);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    return compactMobileNavEnabled;
};
