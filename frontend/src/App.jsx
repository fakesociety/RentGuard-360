import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeToggle } from './components/Toggle';
import LanguageToggle from './components/LanguageToggle';
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';
import DashboardPage from './pages/DashboardPage';
import DashboardBento from './pages/DashboardBento';
import UploadPage from './pages/UploadPage';
import ContractsPage from './pages/ContractsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';
import ContactPage from './pages/ContactPage';
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
        <p>{t ? t('common.loading') : 'Loading...'}</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Modern Navigation Component
const Navigation = () => {
  const { logout, userAttributes } = useAuth();
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
          <span className="logo-icon">🛡️</span>
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

// Landing/Login Page
const LandingPage = () => {
  const { login, register, confirmRegistration, isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempEmail, setTempEmail] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(email, password, name);
    if (result.success) {
      setTempEmail(email);
      setMode('confirm');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await confirmRegistration(tempEmail, code);
    if (result.success) {
      setMode('login');
      setEmail(tempEmail);
      setError('');
    } else {
      setError(result.error || 'Confirmation failed');
    }
    setLoading(false);
  };
  // Carousel state for rotating benefits
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const benefits = [
    {
      title: t('auth.benefitCloud'),
      description: t('auth.benefitCloudDesc')
    },
    {
      title: t('auth.benefitAI'),
      description: t('auth.benefitAIDesc')
    },
    {
      title: t('auth.benefitSecurity'),
      description: t('auth.benefitSecurityDesc')
    },
    {
      title: t('auth.benefitFast'),
      description: t('auth.benefitFastDesc')
    }
  ];

  // Carousel paused state for hover
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % benefits.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, benefits.length]);

  const goToNext = () => setCarouselIndex((prev) => (prev + 1) % benefits.length);
  const goToPrev = () => setCarouselIndex((prev) => (prev - 1 + benefits.length) % benefits.length);

  return (
    <div className="landing-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="landing-header">
        <a href="/" className="landing-logo">🛡️ RentGuard 360</a>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="landing-content">
        {/* Hero Section with Card Background */}
        <div className="hero-card">
          <div className="hero-section">
            <div className="hero-text">
              <h2>{t('auth.heroTitle')}</h2>
              <p className="hero-subtitle">
                {t('auth.heroSubtitle')}
              </p>

              {/* Benefits Carousel with Controls */}
              <div
                className="benefits-carousel"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {isPaused && <span className="carousel-paused">|| {isRTL ? 'מושהה' : 'Paused'}</span>}
                <button className="carousel-arrow carousel-prev" onClick={goToPrev}>{isRTL ? '→' : '←'}</button>
                <div className="carousel-content" key={carouselIndex}>
                  <span className="carousel-number">{carouselIndex + 1}/{benefits.length}</span>
                  <h4>{benefits[carouselIndex].title}</h4>
                  <p>{benefits[carouselIndex].description}</p>
                </div>
                <button className="carousel-arrow carousel-next" onClick={goToNext}>{isRTL ? '←' : '→'}</button>
                <div className="carousel-controls">
                  <div className="carousel-dots">
                    {benefits.map((_, idx) => (
                      <button
                        key={idx}
                        className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`}
                        onClick={() => setCarouselIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">70+</span>
                  <span className="stat-label">גורמי סיכון מנותחים</span>
                </div>
                <div className="stat">
                  <span className="stat-number">&lt;60s</span>
                  <span className="stat-label">זמן ניתוח</span>
                </div>
                <div className="stat">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">הגנה על הפרטיות</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works - Demo Section */}
        <div className="demo-section">
          <h3>איך זה עובד</h3>
          <div className="demo-steps">
            <div className="demo-step">
              <div className="step-number">1</div>
              <div className="step-icon">📄</div>
              <h4>העלאת חוזה</h4>
              <p>העלו את חוזה השכירות שלכם בפורמט PDF. אנחנו תומכים בעברית ואנגלית.</p>
            </div>
            <div className="demo-step">
              <div className="step-number">2</div>
              <div className="step-icon">🤖</div>
              <h4>ניתוח AI</h4>
              <p>ה-AI שלנו סורק סיכונים, תנאים לא הוגנים ובעיות משפטיות.</p>
            </div>
            <div className="demo-step">
              <div className="step-number">3</div>
              <div className="step-icon">📊</div>
              <h4>קבלת תוצאות</h4>
              <p>צפו בציון הסיכון, הסברים לבעיות וטיפים למשא ומתן.</p>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card variant="glass" padding="lg" className="auth-card">
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <h3>{t('auth.login')}</h3>
              <Input
                type="email"
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.loginButton')}</Button>
              <p className="auth-switch">
                {t('auth.noAccount')}{' '}
                <button type="button" onClick={() => { setMode('register'); setError(''); }}>
                  {t('auth.register')}
                </button>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <h3>{t('auth.registerButton')}</h3>
              <Input
                label={t('auth.fullName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText={t('auth.passwordHint')}
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.registerButton')}</Button>
              <p className="auth-switch">
                {t('auth.hasAccount')}{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                  {t('auth.login')}
                </button>
              </p>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirm}>
              <h3>{t('auth.confirmTitle')}</h3>
              <p className="confirm-message">{t('auth.confirmMessage')} {tempEmail}</p>
              <Input
                label={t('auth.confirmCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.confirmButton')}</Button>
            </form>
          )}
        </Card>

        {/* Features Grid */}
        <div className="features-section">
          <Card variant="elevated" padding="md">
            <h4>{t('auth.featureAI')}</h4>
            <p>{t('auth.featureAIDesc')}</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>{t('auth.featurePrivacy')}</h4>
            <p>{t('auth.featurePrivacyDesc')}</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>{t('auth.featureTips')}</h4>
            <p>{t('auth.featureTipsDesc')}</p>
          </Card>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>
            {t('auth.builtBy')}{' '}
            <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
            {' & '}
            <a href="https://github.com/MoTy" target="_blank" rel="noopener noreferrer">Moty</a>
            {' | '}{t('auth.projectName')}
          </p>
        </div>
      </div>
    </div>
  );
};

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
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
        </Routes>
      </main>

      {isAuthenticated && <Footer />}
    </div>
  );
}

export default App;
