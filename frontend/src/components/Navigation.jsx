import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { ThemeToggle } from './Toggle';
import LanguageToggle from './LanguageToggle';
import ScanBadge from './ScanBadge';
import { Shield, Settings } from 'lucide-react';
import { showAppToast } from '../utils/toast';
import './Navigation.css';

// Modern Navigation Component
const Navigation = ({ showAuthControls = false, onAuthClick = () => {} }) => {
  const { logout, userAttributes, isAdmin, isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const { hasSubscription } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

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
    // Only block certain internal routes for authenticated users without a subscription
    const blockedPaths = ['/dashboard', '/upload', '/contracts', '/settings'];
    if (isAuthenticated && !isAdmin && !hasSubscription && blockedPaths.includes(path)) {
      event.preventDefault();
      setShowMobileMenu(false);
      setShowProfileMenu(false);
      notifyBundleRequired();
    }
  };

  return (
    <nav className="nav-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="nav-inner">
        {/* Logo - navigates to dashboard when authenticated, landing when public */}
        <Link to={isAuthenticated ? authenticatedHomePath : '/'} className="nav-logo">
          <Shield size={32} className="logo-icon" />
          <span className="logo-text">RentGuard 360</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={(event) => handleBundleGatedNavigation(event, link.path)}
            >
              {link.icon && <link.icon size={14} className="nav-link-icon" />}
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Scan Badge, Language Toggle, Theme Toggle & Profile */}
        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <ScanBadge />
              <LanguageToggle />
              <ThemeToggle />

              {/* Profile Dropdown */}
              <div className="profile-container" ref={profileRef}>
                <button
                  className="profile-button"
                  onClick={() => {
                    setShowMobileMenu(false); // Close mobile menu when opening profile
                    setShowProfileMenu(!showProfileMenu);
                  }}
                >
                  <div className="profile-avatar">{getUserInitials()}</div>
                  <span className="profile-chevron">{showProfileMenu ? '▲' : '▼'}</span>
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

              {/* Mobile Menu Button */}
              <button
                className="mobile-menu-button"
                onClick={() => {
                  setShowProfileMenu(false); // Close profile when opening mobile menu
                  setShowMobileMenu(!showMobileMenu);
                }}
              >
                {showMobileMenu ? '✕' : '☰'}
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
                  <button className="cta-btn" onClick={() => onAuthClick('register')}>
                    {isRTL ? 'התחל חינם' : 'Start Free'}
                  </button>
                </>
              )}

              <button
                className="mobile-menu-button"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? '✕' : '☰'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="mobile-menu">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-menu-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={(event) => {
                handleBundleGatedNavigation(event, link.path);
                if (!event.defaultPrevented) setShowMobileMenu(false);
              }}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navigation;
