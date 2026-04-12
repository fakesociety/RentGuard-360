/**
 * ============================================
 *  Navigation Menu
 *  Top navbar handling public & authenticated states
 * ============================================
 * 
 * STRUCTURE:
 * - Component Setup & State
 * - Route-based Link rendering
 * - Bundle-gated navigation handling
 * - User Profile menu / Auth controls
 * 
 * DEPENDENCIES:
 * - react-router-dom
 * - AuthContext, SubscriptionContext
 * ============================================
 */

/* ==========================================================================
 * 1. Imports
 * ========================================================================== */
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ThemeToggle } from '../ui/Toggle';
import LanguageToggle from '../ui/LanguageToggle';
import ScanBadge from '../ui/ScanBadge';
import { Shield, Settings } from 'lucide-react';
import { showAppToast } from '@/utils/toast';
import './Navigation.css';

/* ==========================================================================
 * 2. Component Setup & State
 * ========================================================================== */
const Navigation = ({ showAuthControls = false, onAuthClick = () => {}, className = '' }) => {
    const MOBILE_NAV_COMPACT_PREF_KEY = 'rentguard_mobile_nav_compact';
    const { logout, userAttributes, isAdmin, isAuthenticated } = useAuth();
    const { t, isRTL } = useLanguage();
    const { hasSubscription } = useSubscription();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [compactMobileNavEnabled, setCompactMobileNavEnabled] = useState(() => {
        try {
            return localStorage.getItem(MOBILE_NAV_COMPACT_PREF_KEY) === 'true';
        } catch {
            return false;
        }
    });
    
    const navRef = useRef(null);
    const profileRef = useRef(null);

    /* ======================================================================
     * 3. Lifecycle / Effects
     * ====================================================================== */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const updateCompactMode = () => {
            try {
                setCompactMobileNavEnabled(localStorage.getItem(MOBILE_NAV_COMPACT_PREF_KEY) === 'true');
            } catch {
                setCompactMobileNavEnabled(false);
            }
        };

        const onCustomToggle = (event) => {
            if (typeof event?.detail?.enabled === 'boolean') {
                setCompactMobileNavEnabled(event.detail.enabled);
                return;
            }
            updateCompactMode();
        };

        const onStorage = (event) => {
            if (event.key && event.key !== MOBILE_NAV_COMPACT_PREF_KEY) return;
            updateCompactMode();
        };

        window.addEventListener('rg:mobile-nav-compact-changed', onCustomToggle);
        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('rg:mobile-nav-compact-changed', onCustomToggle);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    useEffect(() => {
        const navElement = navRef.current;
        if (!navElement) return undefined;

        const rootElement = document.documentElement;
        const updateMainOffset = () => {
            const navRect = navElement.getBoundingClientRect();
            const nextOffsetPx = Math.max(64, Math.ceil(navRect.bottom + 12));
            rootElement.style.setProperty('--rg-nav-main-offset', `${nextOffsetPx}px`);
        };

        updateMainOffset();

        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => updateMainOffset());
            resizeObserver.observe(navElement);
        }

        window.addEventListener('resize', updateMainOffset);
        window.addEventListener('orientationchange', updateMainOffset);

        return () => {
            window.removeEventListener('resize', updateMainOffset);
            window.removeEventListener('orientationchange', updateMainOffset);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            rootElement.style.removeProperty('--rg-nav-main-offset');
        };
    }, [isAuthenticated, isRTL, location.pathname]);

    /* ======================================================================
     * 4. Helper Functions
     * ====================================================================== */
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const getUserInitials = () => {
        const name = userAttributes?.name || userAttributes?.email || 'U';
        return name.charAt(0).toUpperCase();
    };

    const notifyBundleRequired = () => {
        showAppToast({
            type: 'warning',
            title: t('notifications.bundleRequiredTitle'),
            message: t('notifications.bundleRequiredMessage'),
            duration: 5200,
        });
    };

    const handleBundleGatedNavigation = (event, path) => {
        const blockedPaths = ['/dashboard', '/upload', '/contracts', '/settings'];
        if (isAuthenticated && !isAdmin && !hasSubscription && blockedPaths.includes(path)) {
            event.preventDefault();
            setShowMobileMenu(false);
            setShowProfileMenu(false);
            notifyBundleRequired();
        }
    };

    /* ======================================================================
     * 5. Navigation Configuration
     * ====================================================================== */
    const authLinks = [
        { path: '/dashboard', label: t('nav.dashboard') },
        { path: '/upload', label: t('nav.upload') },
        { path: '/contracts', label: t('nav.contracts') },
        ...(!isAdmin ? [{ path: '/pricing', label: t('nav.pricing') }] : []),
        ...(isAdmin ? [{ path: '/admin', label: t('nav.admin'), icon: Settings }] : []),
    ];

    const publicLinks = [
        { path: '/', label: t('nav.home') },
        { path: '/pricing', label: t('nav.pricing') },
        { path: '/contact', label: t('nav.contact') },
    ];

    const navLinks = isAuthenticated ? authLinks : publicLinks;
    const authenticatedHomePath = isAdmin || hasSubscription ? '/dashboard' : '/pricing';
    const compactModeActive = isAuthenticated && compactMobileNavEnabled;
    const navClasses = [
        'nav-container',
        isAuthenticated ? 'is-authenticated' : 'is-public',
        compactModeActive ? 'mobile-nav-compact' : '',
        className
    ].filter(Boolean).join(' ');

    /* ======================================================================
     * 6. Render / JSX
     * ====================================================================== */
    return (
        <nav ref={navRef} className={navClasses} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="nav-inner">
                <Link to={isAuthenticated ? authenticatedHomePath : '/'} className="nav-logo">
                    <Shield size={32} className="logo-icon" />
                    <span className="logo-text">{t('nav.brand')}</span>
                </Link>

                <div className="nav-links-desktop">
                    {navLinks.map(link => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={(event) => handleBundleGatedNavigation(event, link.path)}
                        >
                            {link.icon && <link.icon size={14} className="nav-link-icon" />}
                            <span className="nav-link-label">{link.label}</span>
                        </NavLink>
                    ))}
                </div>

                <div className="nav-right" dir="ltr">
                    {isAuthenticated ? (
                        <>
                            <ScanBadge />
                            <LanguageToggle />
                            <ThemeToggle />

                            <div className="profile-container" ref={profileRef}>
                                <button
                                    className="profile-button"
                                    onClick={() => {
                                        setShowMobileMenu(false);
                                        setShowProfileMenu(!showProfileMenu);
                                    }}
                                    aria-haspopup="true"
                                    aria-expanded={showProfileMenu}
                                    aria-label={showProfileMenu ? t('nav.closeProfile') : t('nav.openProfile')}
                                >
                                    <div className="profile-avatar">{getUserInitials()}</div>
                                    <span className="profile-chevron" aria-hidden="true">{showProfileMenu ? '▲' : '▼'}</span>
                                </button>

                                {showProfileMenu && (
                                    <div className="profile-dropdown">
                                        <div className="profile-header">
                                            <div className="profile-avatar-large">{getUserInitials()}</div>
                                            <div className="profile-info">
                                                <p className="profile-name">{userAttributes?.name || t('common.user')}</p>
                                                <p className="profile-email">{userAttributes?.email}</p>
                                            </div>
                                        </div>
                                        <div className="profile-divider"></div>
                                        <Link
                                            to="/contact"
                                            className="profile-menu-item"
                                            onClick={(event) => {
                                                handleBundleGatedNavigation(event, '/contact');
                                                if (!event.defaultPrevented) setShowProfileMenu(false);
                                            }}
                                        >
                                            {t('nav.contact')}
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="profile-menu-item"
                                            onClick={(event) => {
                                                handleBundleGatedNavigation(event, '/settings');
                                                if (!event.defaultPrevented) setShowProfileMenu(false);
                                            }}
                                        >
                                            {t('nav.settings')}
                                        </Link>
                                        <button className="profile-menu-item logout" onClick={handleLogout}>
                                            {t('nav.logout')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                className="mobile-menu-button"
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    setShowMobileMenu(!showMobileMenu);
                                }}
                                aria-label={showMobileMenu ? t('nav.closeMenu') : t('nav.openMenu')}
                            >
                                <span aria-hidden="true">{showMobileMenu ? '✕' : '☰'}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <LanguageToggle />
                            <ThemeToggle />
                            {showAuthControls && (
                                <>
                                    <button className="auth-btn" onClick={() => onAuthClick('login')}>
                                        {t('auth.login')}
                                    </button>
                                    <button className="cta-btn public-cta-btn" onClick={() => onAuthClick('register')}>
                                        {t('pricing.getStarted')}
                                    </button>
                                </>
                            )}

                            <button
                                className="mobile-menu-button"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                aria-label={showMobileMenu ? t('nav.closeMenu') : t('nav.openMenu')}
                            >
                                <span aria-hidden="true">{showMobileMenu ? '✕' : '☰'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showMobileMenu && (
                <div className="mobile-menu">
                    {isAuthenticated && !compactModeActive && (
                        <div className="mobile-menu-badge-wrapper">
                            <ScanBadge />
                        </div>
                    )}
                    
                    {navLinks.map(link => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => `mobile-menu-link ${isActive ? 'active' : ''}`}
                            onClick={(event) => {
                                handleBundleGatedNavigation(event, link.path);
                                if (!event.defaultPrevented) setShowMobileMenu(false);
                            }}
                        >
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navigation;
Navigation.propTypes = {
    showAuthControls: PropTypes.bool,
    onAuthClick: PropTypes.func,
    className: PropTypes.string,
};
