import { useLocation } from 'react-router-dom';

export const useRouteLayout = (isAuthenticated) => {
    const location = useLocation();

    // Determine layout visibility based on current route
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isContractsRoute = location.pathname === '/contracts';
    
    // Restrict the chat widget to specific pages
    const isContractChatRoute =
        location.pathname === '/dashboard' ||
        location.pathname === '/contracts' ||
        location.pathname.startsWith('/analysis/');
    
    // Public pages where the footer is always visible
    const showPublicFooter = location.pathname === '/pricing' || location.pathname === '/contact' || location.pathname === '/';
    
    // Navigation is hidden on the admin dashboard and on the public home page for guests
    const navVisible = !isAdminRoute && (isAuthenticated || location.pathname !== '/');

    return {
        isAdminRoute,
        isContractsRoute,
        isContractChatRoute,
        showPublicFooter,
        navVisible
    };
};
