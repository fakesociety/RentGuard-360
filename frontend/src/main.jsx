/**
 * ============================================
 *  RentGuard 360 - main.jsx
 *  Application Entry Point
 * ============================================
 * 
 * PROVIDER HIERARCHY:
 * - StrictMode (React dev checks)
 * - GlobalErrorBoundary (error catching)
 * - BrowserRouter (routing)
 * - ThemeProvider (dark/light mode)
 * - LanguageProvider (i18n)
 * - AuthProvider (Cognito auth)
 * - App (main component)
 * 
 * ============================================
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext/LanguageContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary';
import './styles/design-system.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <App />
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
