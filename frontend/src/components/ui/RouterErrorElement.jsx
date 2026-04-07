import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import './GlobalErrorBoundary.css';

const getRouteErrorText = (error) => {
    if (!error) return '';
    if (isRouteErrorResponse(error)) {
        return `${error.status} ${error.statusText || ''}`.trim();
    }
    if (error instanceof Error) {
        return error.message || error.toString();
    }
    return String(error);
};

const RouterErrorElement = () => {
    const { t, isRTL } = useLanguage();
    const error = useRouteError();
    const details = getRouteErrorText(error);

    return (
        <div className="global-error-boundary" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="global-error-boundary-card">
                <AlertTriangle size={64} color="var(--accent-danger)" className="global-error-boundary-icon" />
                <h1 className="global-error-boundary-title">{t('errorBoundary.title') || 'Error'}</h1>
                <p className="global-error-boundary-message">{t('errorBoundary.message') || 'An unexpected error occurred.'}</p>

                <Button variant="primary" onClick={() => window.location.reload()} fullWidth>
                    <RefreshCw size={18} className="global-error-boundary-reload-icon" />
                    {t('errorBoundary.reload') || 'Reload'}
                </Button>

                {import.meta.env.DEV && details && (
                    <details className="global-error-boundary-details">
                        <summary className="global-error-boundary-summary">{t('errorBoundary.details') || 'Details'}</summary>
                        <pre className="global-error-boundary-pre">{details}</pre>
                    </details>
                )}
            </div>
        </div>
    );
};

export default RouterErrorElement;
