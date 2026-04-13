import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigationUI } from './hooks/useNavigationUI';
import { useCompactNavPrefs } from './hooks/useCompactNavPrefs';
import { useBundleGatedNavigation } from './hooks/useBundleGatedNavigation';
import { ThemeToggle } from '../../ui/Toggle';
import LanguageToggle from '../../ui/LanguageToggle';
import ScanBadge from '../../ui/ScanBadge';
import { Shield, Settings } from 'lucide-react';
import './Navigation.css';

/**
 * Global Navigation Bar Component.
 * Responsibilities:
 * - Renders dynamic links based on Auth & Subscription states.
 * - Handles access-gating (preventing non-subscribed users from accessing protected views).
 * - Manages responsive mobile and desktop menus.
 */
const Navigation = ({ showAuthControls = false, onAuthClick = () => {}, className = '' }) => {
    // Global Contexts
    const { logout, userAttributes, isAdmin, isAuthenticated } = useAuth();
    const { t, isRTL } = useLanguage();
    const { hasSubscription } = useSubscription();
    
    const navigate = useNavigate();
    
    // Custom Hooks for UI & State Logic
const { 
        showProfileMenu, 
        setShowProfileMenu, 
        showMobileMenu, 
        setShowMobileMenu, 
        navRef, 
        profileRef 
    } = useNavigationUI(isAuthenticated, isRTL);

    const compactMobileNavEnabled = useCompactNavPrefs();
    
    // Gated Navigation logic hooked directly to toasts
    const handleBundleGatedNavigation = useBundleGatedNavigation(
        isAuthenticated, 
        isAdmin, 
        hasSubscription, 
        () => {
            setShowMobileMenu(false);
            setShowProfileMenu(false);
        }
    );

    // --- Action Handlers ---

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const getUserInitials = () => {
        const name = userAttributes?.name || userAttributes?.email || 'U';
        return name.charAt(0).toUpperCase();
    };

    // --- Route Configuration ---

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

    return (
        <nav ref={navRef} className={navClasses} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="nav-inner">
                {/* Brand Logo */}
                <Link to={isAuthenticated ? authenticatedHomePath : '/'} className="nav-logo">
                    <Shield size={32} className="logo-icon" />
                    <span className="logo-text">{t('nav.brand')}</span>
                </Link>

                {/* Desktop Links */}
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

                {/* Right Side Controls */}
                <div className="nav-right" dir="ltr">
                    {isAuthenticated ? (
                        <>
                            <ScanBadge />
                            <LanguageToggle />
                            <ThemeToggle />

                            {/* User Profile Dropdown */}
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
                                    <div className="profile-avatar">{getUserInitials(userAttributes)}</div>
                                    <span className="profile-chevron" aria-hidden="true">{showProfileMenu ? '▲' : '▼'}</span>
                                </button>

                                {showProfileMenu && (
                                    <div className="profile-dropdown">
                                        <div className="profile-header">
                                            <div className="profile-avatar-large">{getUserInitials(userAttributes)}</div>
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

                            {/* Mobile Hamburger Toggle (Authenticated) */}
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
                            
                            {/* Guest Auth Controls */}
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

                            {/* Mobile Hamburger Toggle (Guest) */}
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

            {/* Mobile Menu Overlay */}
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

Navigation.propTypes = {
    showAuthControls: PropTypes.bool,
    onAuthClick: PropTypes.func,
    className: PropTypes.string,
};

export default Navigation;
