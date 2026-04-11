/**
 * ============================================
 *  Route Guards
 *  Higher Order Components for Route Protection
 * ============================================
 * 
 * STRUCTURE:
 * - ProtectedRoute: Requires login
 * - RequireActivePlanRoute: Requires subscription
 * 
 * DEPENDENCIES:
 * - AuthContext, SubscriptionContext
 * - react-router-dom (Navigate)
 * ============================================
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './RouteGuards.css';
import { GlobalSpinner } from '../ui/GlobalSpinner';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <GlobalSpinner fullPage />;
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export const RequireActivePlanRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown, error, refreshSubscription } = useSubscription();
  const location = useLocation();
  const { t } = useLanguage();

  if (isAdmin) return children;

  if (isSubscriptionLoading || !isEntitlementKnown) {
    return (
      <GlobalSpinner fullPage text={t('checkingYourPlan') || "Checking your plan..."} />
    );
  }

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

  if (!hasSubscription) {
    return <Navigate to="/pricing" replace state={{ from: location.pathname }} />;
  }

  return children;
};


ProtectedRoute.propTypes = { children: PropTypes.node };
RequireActivePlanRoute.propTypes = { children: PropTypes.node };
