import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { GlobalSpinner } from '@/components/ui/GlobalSpinner';

export const SharedLoadingState = () => {
    const { t } = useLanguage();
    return (
        <div className="shared-state-card shared-state-loading">
            <GlobalSpinner fullPage />
            <h2>{t('sharedContract.loadingTitle')}</h2>
            <p>{t('sharedContract.loadingSubtitle')}</p>
        </div>
    );
};

export const SharedErrorState = ({ error, onRetry }) => {
    const { t } = useLanguage();
    return (
        <section className="shared-state-card shared-state-error">
            <AlertTriangle size={24} aria-hidden="true" />
            <h2>{t('sharedContract.errorTitle')}</h2>
            <p>{error}</p>
            <div className="shared-state-actions">
                <button className="shared-btn shared-btn-primary" onClick={onRetry}>
                    {t('sharedContract.retryButton')}
                </button>
            </div>
        </section>
    );
};

export const SharedWarningState = () => {
    const { t } = useLanguage();
    return (
        <section className="shared-state-card shared-state-warning">
            <ShieldCheck size={24} aria-hidden="true" />
            <h2>{t('sharedContract.notRentalTitle')}</h2>
            <p>{t('sharedContract.notRentalDesc')}</p>
        </section>
    );
};
