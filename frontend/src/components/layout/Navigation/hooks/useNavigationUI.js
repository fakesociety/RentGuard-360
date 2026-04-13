import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Manages the navigation UI state, including mobile menu toggling and dynamic header offset calculations.
 */
export function useNavigationUI(isAuthenticated, isRTL) {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    
    const navRef = useRef(null);
    const profileRef = useRef(null);
    const location = useLocation();

    // Close menus when route changes
    useEffect(() => {
        // Set state inside an effect might trigger cascading renders.
        // Using it safely here to reset the navigation UI on route complete.
        let isMounted = true;
        if (isMounted) {
            setShowMobileMenu(false);
            setShowProfileMenu(false);
        }
        return () => { isMounted = false; };
    }, [location.pathname]);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate dynamic offset based on nav height.
    useEffect(() => {
        const calculateOffset = () => {
            if (navRef.current) {
                const navHeight = navRef.current.offsetHeight;
                document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
            }
        };

        const observer = new ResizeObserver(calculateOffset);
        if (navRef.current) {
            observer.observe(navRef.current);
            // Run initially
            calculateOffset();
        }

        return () => {
            observer.disconnect();
        };
    }, [isAuthenticated, isRTL]);

    return {
        showProfileMenu,
        setShowProfileMenu,
        showMobileMenu,
        setShowMobileMenu,
        navRef,
        profileRef
    };
}
