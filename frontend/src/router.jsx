/* eslint-disable react-refresh/only-export-components */
/**
 * File: router.jsx
 * Purpose: Central routing configuration for the entire application.
 * Logic: Maps URLs to their respective React components using nested routes and route guards for access control. Utilizes React.lazy for code splitting to improve initial load performance.
 * Important: Uses createHashRouter instead of createBrowserRouter to prevent 404 errors on page refresh, as the app is hosted on a static environment (AWS S3) without native server routing.
 */
import React, { lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ProtectedRoute, RequireActivePlanRoute } from '@/components/layout/RouteGuards';
import RouterErrorElement from '@/components/ui/RouterErrorElement';
import { useAuth } from '@/contexts/AuthContext';

// Lazy loaded pages
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const DashboardPage = lazy(() => import('@/pages/core/DashboardPage'));
const UploadPage = lazy(() => import('@/pages/core/UploadPage'));
const ContractsPage = lazy(() => import('@/pages/core/ContractsPage'));
const AnalysisPage = lazy(() => import('@/pages/core/AnalysisPage'));
const SharedContractView = lazy(() => import('@/pages/core/SharedContractView'));
const SettingsPage = lazy(() => import('@/pages/core/SettingsPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const ContactPublic = lazy(() => import('@/pages/public/ContactPublic'));
const PricingPage = lazy(() => import('@/pages/billing/PricingPage'));
const PricingPublic = lazy(() => import('@/pages/public/PricingPublic'));
const CheckoutPage = lazy(() => import('@/pages/billing/CheckoutPage'));
const PaymentSuccessPage = lazy(() => import('@/pages/billing/PaymentSuccessPage'));
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'));
const TermsPage = lazy(() => import('@/pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayoutPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminStripeInsights = lazy(() => import('@/pages/admin/AdminStripeInsightsPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));

// Helper components for conditional public/protected routes
const ConditionalPricingRoute = () => {
    const { isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth();
    if (isAuthLoading) return null; // Avoid blink by waiting for auth to resolve
    if (!isAuthenticated) return <PricingPublic />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    return <ProtectedRoute><PricingPage /></ProtectedRoute>;
};

const ConditionalContactRoute = () => {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    if (isAuthLoading) return null; // Avoid blink by waiting for auth to resolve
    if (!isAuthenticated) return <ContactPublic />;
    return <ProtectedRoute><RequireActivePlanRoute><ContactPage /></RequireActivePlanRoute></ProtectedRoute>;
};

export const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouterErrorElement />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "index.html", element: <LandingPage /> },
      { path: "dashboard", element: <ProtectedRoute><RequireActivePlanRoute><DashboardPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "upload", element: <ProtectedRoute><RequireActivePlanRoute><UploadPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "contracts", element: <ProtectedRoute><RequireActivePlanRoute><ContractsPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "analysis/:contractId", element: <ProtectedRoute><RequireActivePlanRoute><AnalysisPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute><RequireActivePlanRoute><SettingsPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "billing", element: <ProtectedRoute><RequireActivePlanRoute><BillingPage /></RequireActivePlanRoute></ProtectedRoute> },
      { path: "contact", element: <ConditionalContactRoute /> },
      { path: "pricing", element: <ConditionalPricingRoute /> },
      { path: "checkout/:packageId", element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      { path: "payment-success", element: <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute> },
      { path: "shared/:id", element: <SharedContractView /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      {
        path: "admin",
        element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "users", element: <AdminUsers /> },
          { path: "analytics", element: <AdminAnalytics /> },
          { path: "stripe", element: <AdminStripeInsights /> }
        ]
      },
      { path: "*", element: <NotFoundPage /> } // Changed from FallbackRoute(Old deleted func) to standard 404 page!
    ]
  }
]);
