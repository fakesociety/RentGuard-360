import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import './RouteGuards.css';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="app-loading"><div className="loading-spinner"></div></div>;
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export const RequireActivePlanRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown, error, refreshSubscription } = useSubscription();
  const location = useLocation();

  if (isAdmin) return children;

  if (isSubscriptionLoading || !isEntitlementKnown) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Checking your plan...</p>
      </div>
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
