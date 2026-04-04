import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Shield, RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';
import Button from './Button';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import './GlobalErrorBoundary.css';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
    const { t, isRTL } = useLanguage();
    
    return (
        <div className="global-error-boundary" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="global-error-boundary-card">
                <Shield size={64} color="var(--primary)" className="global-error-boundary-icon" />
                <h1 className="global-error-boundary-title">{t('errorBoundary.title') || 'Error'}</h1>
                <p className="global-error-boundary-message">{t('errorBoundary.message') || 'An unexpected error occurred.'}</p>

                <Button variant="primary" onClick={resetErrorBoundary} fullWidth>
                    <RefreshCw size={18} className="global-error-boundary-reload-icon" />
                    {t('errorBoundary.reload') || 'Reload'}
                </Button>

                {import.meta.env.DEV && error && (
                    <details className="global-error-boundary-details"> 
                        <summary className="global-error-boundary-summary">{t('errorBoundary.details') || 'Details'}</summary>
                        <pre className="global-error-boundary-pre">     
                            {error.toString()}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
};

const GlobalErrorBoundary = ({ children }) => {
    const handleReset = () => {
        window.location.reload();
    };

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReset}>
            {children}
        </ErrorBoundary>
    );
};

ErrorFallback.propTypes = {
    error: PropTypes.object.isRequired,
    resetErrorBoundary: PropTypes.func.isRequired
};

GlobalErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default GlobalErrorBoundary;
