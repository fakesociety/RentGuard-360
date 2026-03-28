/**
 * ============================================
 *  RentGuard 360 - App.jsx
 *  Main Application Shell
 * ============================================
 * 
 * This file contains:
 * - Top Navbar (Desktop & Mobile)
 * - Hamburger Mobile Menu
 * - Main Application Routing
 * - Footer (shown when authenticated)
 * 
 * NOTE: Footer.jsx is a shared component used here AND in LandingPage.jsx
 * NOTE: Admin pages use AdminLayout with sidebar (no main nav)
 * ============================================
 */
import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { useSubscription } from './contexts/SubscriptionContext';
import Navigation from './components/Navigation';
import ContactPublic from './pages/ContactPublic';
import PricingPublic from './pages/PricingPublic';
import { showAppToast } from './utils/toast';
import DashboardPage from './pages/DashboardPage';
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const SharedContractView = lazy(() => import('./pages/SharedContractView'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const AdminLayout = lazy(() => import('./pages/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminStripeInsights = lazy(() => import('./pages/AdminStripeInsights'));
import LandingPage from './pages/LandingPage';
import Footer from './components/Footer';
const ContractChatWidget = lazy(() => import('./components/ContractChatWidget'));
import './styles/design-system.css';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

const RequireActivePlanRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  const { hasSubscription, isLoading: isSubscriptionLoading, isEntitlementKnown } = useSubscription();
  const location = useLocation();

  if (isAdmin) {
    return children;
  }

  if (isSubscriptionLoading || !isEntitlementKnown) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Checking your plan...</p>
      </div>
    );
  }

  if (!hasSubscription) {
    return <Navigate to="/pricing" replace state={{ from: location.pathname }} />;
  }

  return children;
};


function App() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const { isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current route is an admin page
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isContractChatRoute =
    location.pathname === '/dashboard' ||
    location.pathname === '/contracts' ||
    location.pathname.startsWith('/analysis/');
  const showPublicFooter = location.pathname === '/pricing' || location.pathname === '/contact';

  // Should we render the main Navigation for this route?
  const navVisible = !isAdminRoute && (isAuthenticated || location.pathname !== '/');

  useEffect(() => {
    const handleToast = (event) => {
      const nextToast = event?.detail;
      if (!nextToast) return;
      showAppToast(nextToast);
    };

    window.addEventListener('rg:toast', handleToast);
    return () => window.removeEventListener('rg:toast', handleToast);
  }, []);

  useEffect(() => {
    // Best-effort cleanup of expired persisted toast (no state updates here)
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
      // ignore
    }
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading RentGuard 360...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster
        position={isRTL ? 'top-left' : 'top-right'}
        reverseOrder={false}
        gutter={10}
        containerStyle={{ top: 16 }}
        toastOptions={{
          style: {
            pointerEvents: 'auto',
          },
        }}
      />
      {/* Main nav: render for all non-admin pages. Landing page renders its own Navigation internally. */}
      {navVisible && (
        <Navigation showAuthControls={!isAuthenticated} onAuthClick={(type) => {
          if (!isAuthenticated) navigate(`/?auth=${type}`);
        }} />
      )}

      <main className={`app-main ${isAdminRoute ? 'admin-page' : ''} ${navVisible ? 'with-nav' : ''}`}>
        <Suspense
          fallback={
            <div className="app-loading">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><RequireActivePlanRoute><DashboardPage /></RequireActivePlanRoute></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><RequireActivePlanRoute><UploadPage /></RequireActivePlanRoute></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><RequireActivePlanRoute><ContractsPage /></RequireActivePlanRoute></ProtectedRoute>} />
            <Route path="/analysis/:contractId" element={<ProtectedRoute><RequireActivePlanRoute><AnalysisPage /></RequireActivePlanRoute></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><RequireActivePlanRoute><SettingsPage /></RequireActivePlanRoute></ProtectedRoute>} />
            <Route path="/contact" element={isAuthenticated ? <ProtectedRoute><RequireActivePlanRoute><ContactPage /></RequireActivePlanRoute></ProtectedRoute> : <ContactPublic />} />
            <Route path="/pricing" element={isAuthenticated ? <ProtectedRoute>{isAdmin ? <Navigate to="/dashboard" replace /> : <PricingPage />}</ProtectedRoute> : <PricingPublic />} />
            <Route path="/checkout/:packageId" element={<ProtectedRoute>{isAdmin ? <Navigate to="/dashboard" replace /> : <CheckoutPage />}</ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
            <Route path="/shared/:id" element={<SharedContractView />} />

            {/* Admin routes with sidebar layout */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="stripe" element={<AdminStripeInsights />} />
            </Route>

            <Route path="*" element={<Navigate to={isAuthenticated ? "/pricing" : "/"} replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Hide footer on admin pages; show on authenticated app and selected public pages */}
      {!isAdminRoute && (isAuthenticated || showPublicFooter) && <Footer />}

      {/* Show contract chat only in contract-relevant user flows */}
      {isAuthenticated && !isAdminRoute && isContractChatRoute && (
        <Suspense fallback={null}>
          <ContractChatWidget />
        </Suspense>
      )}
    </div>
  );
}

export default App;

