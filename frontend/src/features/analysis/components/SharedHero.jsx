import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

export const SharedHero = ({ contractViewRef }) => {
    const { t } = useLanguage();

    return (
        <header className="shared-hero">
            <div className="shared-hero-text">
                <span className="shared-kicker">RentGuard 360</span>
                <h1>{t('sharedContract.viewTitle')}</h1>
                <p className="shared-subtitle">{t('sharedContract.viewSubtitle')}</p>
            </div>
            <div className="shared-hero-actions">
                <button
                    className="shared-btn shared-btn-primary"
                    onClick={() => contractViewRef.current?.handleExport()}
                >
                    <Download size={18} />
                    <span>{t('sharedContract.exportWord')}</span>
                </button>
            </div>
        </header>
    );
};
