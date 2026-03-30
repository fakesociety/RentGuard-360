/**
 * ============================================
 *  GlobalErrorBoundary
 *  Application-Wide Error Handler
 * ============================================
 * 
 * STRUCTURE:
 * - Error UI with logo and message
 * - Reload button
 * - Dev-only error details
 * 
 * FEATURES:
 * - Catches uncaught React errors
 * - Displays friendly error screen
 * - Shows stack trace in development
 * - Bilingual error message
 * 
 * ============================================
 */
import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import Button from './Button';
import LanguageContext from '../contexts/LanguageContext';
import './GlobalErrorBoundary.css';

class GlobalErrorBoundary extends React.Component {
    static contextType = LanguageContext;

    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const languageContext = this.context || {};
        const t = languageContext.t || ((key) => key);
        const isRTL = languageContext.isRTL ?? true;

        if (this.state.hasError) {
            return (
                <div className="global-error-boundary" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="global-error-boundary-card">
                        <Shield size={64} color="var(--primary)" className="global-error-boundary-icon" />
                        <h1 className="global-error-boundary-title">{t('errorBoundary.title')}</h1>
                        <p className="global-error-boundary-message">{t('errorBoundary.message')}</p>

                        <Button variant="primary" onClick={this.handleReload} fullWidth>
                            <RefreshCw size={18} className="global-error-boundary-reload-icon" />
                            {t('errorBoundary.reload')}
                        </Button>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="global-error-boundary-details">
                                <summary className="global-error-boundary-summary">{t('errorBoundary.details')}</summary>
                                <pre className="global-error-boundary-pre">
                                    {this.state.error.toString()}
                                    <br />
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
