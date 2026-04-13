import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollRestoration = () => {
    const location = useLocation();

    // Scroll restoration: Ensure new page loads start at the top
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);
};
