import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './RouteGuards.css';
import { GlobalSpinner } from '../ui/GlobalSpinner';

/**
 * Route Guards (Higher-Order Components).
 * Intercepts navigation to protected routes and enforces access control policies
 * based on Authentication and Subscription Entitlements.
 */

/**
 * Ensures the user is logged in.
 * Prevents flashing of protected content by waiting for auth initialization (isLoading).
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <GlobalSpinner fullPage />;
  
  // Redirect unauthenticated users to the public landing/login page
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

/**
 * Ensures the user has an active premium subscription.
 * Implements fallback UI for network errors during entitlement checks.
 */
export const RequireActivePlanRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown, error, refreshSubscription } = useSubscription();
  const location = useLocation();
  const { t } = useLanguage();

  // Admins automatically bypass billing checks to retain full system access
  if (isAdmin) return children;

  // Block rendering until subscription status is definitively known from the backend
  if (isSubscriptionLoading || !isEntitlementKnown) {
    return (
      <GlobalSpinner fullPage text={t('checkingYourPlan') || "Checking your plan..."} />
    );
  }

  // Graceful degradation: If the billing service (Stripe) is unreachable,
  // allow the user to manually retry rather than silently failing or falsely blocking access.
  if (error) {
    return (
      <div className="app-error route-guard-error">
        <h2 className="route-guard-error-title">Connection Error</h2>
        <p className="route-guard-error-text">We could not verify your subscription status due to a network or server error ({error}). Please make sure you are connected to the internet and try again.</p>
        <button 
          onClick={() => refreshSubscription()} 
          className="route-guard-retry-btn"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Redirect free users to the pricing page.
  // Passing the current location in the router state allows the pricing page
  // to redirect them back here seamlessly after a successful upgrade.
  if (!hasSubscription) {
    return <Navigate to="/pricing" replace state={{ from: location.pathname }} />;
  }

  return children;
};

ProtectedRoute.propTypes = { children: PropTypes.node };
RequireActivePlanRoute.propTypes = { children: PropTypes.node };