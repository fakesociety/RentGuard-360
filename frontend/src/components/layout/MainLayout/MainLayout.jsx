import React, { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useRouteLayout } from './hooks/useRouteLayout';
import { useGlobalToasts } from './hooks/useGlobalToasts';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import Navigation from '../Navigation/Navigation';
import Footer from '../Footer';

// Lazy loading the chat widget to reduce the initial bundle size
const ContractChatWidget = React.lazy(() => import('@/features/chat/components/ContractChatWidget.jsx'));

/**
 * MainLayout Component.
 * Acts as the root wrapper for the application.
 * Manages global UI state (Navigation, Footer, Chat Widget) based on current routes and auth status.
 * Also handles global toast notifications and scroll restoration.
 */
const MainLayout = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const { isRTL } = useLanguage();
    const navigate = useNavigate();

    // Custom hooks to manage layout visibility logic and global side-effects
    const {
        isAdminRoute,
        isContractsRoute,
        isContractChatRoute,
        showPublicFooter,
        navVisible
    } = useRouteLayout(isAuthenticated);

    useScrollRestoration();
    useGlobalToasts();

    if (isLoading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
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
                toastOptions={{ style: { pointerEvents: 'auto' } }}
            />
            
            {navVisible && (
                <Navigation 
                    showAuthControls={!isAuthenticated} 
                    onAuthClick={(type) => { if (!isAuthenticated) navigate(`/?auth=${type}`); }} 
                />
            )}

            <main className={`app-main ${isAdminRoute ? 'admin-page' : ''} ${navVisible ? 'with-nav' : ''} ${isContractsRoute ? 'contracts-route-active' : ''}`}>
                <Suspense fallback={<div className="app-loading"><div className="loading-spinner"></div></div>}>
                    <Outlet />
                </Suspense>
            </main>

            {!isAdminRoute && (isAuthenticated || showPublicFooter) && <Footer />}

            {/* Condially render the chat widget only for authenticated users on relevant pages */}
            {isAuthenticated && !isAdminRoute && isContractChatRoute && (
                <Suspense fallback={null}>
                    <ContractChatWidget />
                </Suspense>
            )}
        </div>
    );
};

export default MainLayout;
