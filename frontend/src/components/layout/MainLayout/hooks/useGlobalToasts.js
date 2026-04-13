import { useEffect } from 'react';
import { showAppToast } from '@/components/ui/toast/toast';

export const useGlobalToasts = () => {
    // Listen for custom global toast events
    useEffect(() => {
        const handleToast = (event) => {
            const nextToast = event?.detail;
            if (!nextToast) return;
            showAppToast(nextToast);
        };

        window.addEventListener('rg:toast', handleToast);
        return () => window.removeEventListener('rg:toast', handleToast);
    }, []);

    // Handle persisted toasts from sessionStorage
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('rg_toast');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.createdAt && parsed?.ttlMs) {
                const remaining = (parsed.createdAt + parsed.ttlMs) - Date.now();
                if (remaining <= 0) {
                    sessionStorage.removeItem('rg_toast');
                } else {
                    showAppToast(parsed);
                    sessionStorage.removeItem('rg_toast');
                }
            }
        } catch {
            // Failsafe: Ignore parse errors
        }
    }, []);
};
