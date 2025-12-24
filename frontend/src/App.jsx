import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeToggle } from './components/Toggle';
import LanguageToggle from './components/LanguageToggle';
import Button from './components/Button';
import { Shield } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import DashboardBento from './pages/DashboardBento';
import UploadPage from './pages/UploadPage';
import ContractsPage from './pages/ContractsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPageNew';
import Footer from './components/Footer';
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

// Modern Navigation Component
const Navigation = () => {
  const { logout, userAttributes, isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
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

  const navLinks = [
    { path: '/dashboard', label: t('nav.dashboard') },
    { path: '/upload', label: t('nav.upload') },
    { path: '/contracts', label: t('nav.contracts') },
    ...(isAdmin ? [{ path: '/admin', label: t('nav.admin') }] : []),
  ];

  const getUserInitials = () => {
    const name = userAttributes?.name || userAttributes?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="nav-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="nav-inner">
        {/* Logo - Keep English */}
        <Link to="/dashboard" className="nav-logo">
          <Shield size={22} className="logo-icon" />
          <span className="logo-text">RentGuard 360</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="nav-links-desktop">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
            >
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Language Toggle, Theme Toggle & Profile */}
        <div className="nav-right">
          <LanguageToggle />
          <ThemeToggle />

          {/* Profile Dropdown */}
          <div className="profile-container" ref={profileRef}>
            <button
              className="profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
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
                <Link to="/contact" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  {t('nav.contact')}
                </Link>
                <Link to="/settings" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
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
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
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
              onClick={() => setShowMobileMenu(false)}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="mobile-menu-divider"></div>
          <Link to="/settings" className="mobile-menu-link" onClick={() => setShowMobileMenu(false)}>
            <span>הגדרות</span>
          </Link>
          <button className="mobile-menu-link logout" onClick={handleLogout}>
            <span>התנתקות</span>
          </button>
        </div>
      )}
    </nav>
  );
};

// SettingsPage is now imported from ./pages/SettingsPage
// LandingPage is now imported from ./pages/LandingPage

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>טוען RentGuard 360...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isAuthenticated && <Navigation />}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard-demo" element={<ProtectedRoute><DashboardBento /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/analysis/:contractId" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </main>

      {isAuthenticated && <Footer />}
    </div>
  );
}

export default App;
