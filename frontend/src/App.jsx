import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeToggle } from './components/Toggle';
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';
import DashboardPage from './pages/DashboardPage';
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
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Modern Navigation Component
const Navigation = () => {
  const { logout, userAttributes } = useAuth();
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
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/upload', label: 'Upload', icon: '📤' },
    { path: '/contracts', label: 'Contracts', icon: '📄' },
  ];

  const getUserInitials = () => {
    const name = userAttributes?.name || userAttributes?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="nav-container">
      <div className="nav-inner">
        {/* Logo */}
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
              <span className="nav-link-icon">{link.icon}</span>
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Theme Toggle & Profile */}
        <div className="nav-right">
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
                    <p className="profile-name">{userAttributes?.name || 'User'}</p>
                    <p className="profile-email">{userAttributes?.email}</p>
                  </div>
                </div>
                <div className="profile-divider"></div>
                <Link to="/contact" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  <span>📧</span> Contact Support
                </Link>
                <Link to="/settings" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                  <span>⚙️</span> Settings
                </Link>
                <button className="profile-menu-item logout" onClick={handleLogout}>
                  <span>🚪</span> Logout
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
            <span>⚙️</span> Settings
          </Link>
          <button className="mobile-menu-link logout" onClick={handleLogout}>
            <span>🚪</span> Logout
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
      icon: '☁️',
      title: 'Built on AWS Cloud',
      description: 'Enterprise-grade infrastructure with 99.99% uptime. Your documents are processed securely in the cloud.'
    },
    {
      icon: '🧠',
      title: 'Amazon Bedrock AI',
      description: 'Powered by the latest Meta Llama 3.1 model - one of the smartest AI systems available today.'
    },
    {
      icon: '🔐',
      title: 'Bank-Level Security',
      description: 'End-to-end encryption. Your personal data is auto-redacted before AI analysis. Zero data retention.'
    },
    {
      icon: '⚡',
      title: 'Instant Analysis',
      description: 'Get comprehensive lease review in under 60 seconds. No waiting, no appointments needed.'
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
  }, [isPaused]);

  const goToNext = () => setCarouselIndex((prev) => (prev + 1) % benefits.length);
  const goToPrev = () => setCarouselIndex((prev) => (prev - 1 + benefits.length) % benefits.length);

  return (
    <div className="landing-page">
      <div className="landing-header">
        <a href="/" className="landing-logo">🛡️ RentGuard 360</a>
        <ThemeToggle />
      </div>

      <div className="landing-content">
        {/* Hero Section with Card Background */}
        <div className="hero-card">
          <div className="hero-section">
            <div className="hero-text">
              <h2>AI-Powered Lease Analysis</h2>
              <p className="hero-subtitle">
                Don't sign a rental contract without understanding it first.
                Our AI analyzes your lease in seconds to identify risks, unfair clauses,
                and gives you negotiation tips.
              </p>

              {/* Benefits Carousel with Controls */}
              <div
                className="benefits-carousel"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {isPaused && <span className="carousel-paused">⏸ Paused</span>}
                <button className="carousel-arrow carousel-prev" onClick={goToPrev}>←</button>
                <div className="carousel-content" key={carouselIndex}>
                  <span className="carousel-icon">{benefits[carouselIndex].icon}</span>
                  <h4>{benefits[carouselIndex].title}</h4>
                  <p>{benefits[carouselIndex].description}</p>
                </div>
                <button className="carousel-arrow carousel-next" onClick={goToNext}>→</button>
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
                  <span className="stat-label">Risk Factors Analyzed</span>
                </div>
                <div className="stat">
                  <span className="stat-number">&lt;60s</span>
                  <span className="stat-label">Analysis Time</span>
                </div>
                <div className="stat">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Privacy Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works - Demo Section */}
        <div className="demo-section">
          <h3>How It Works</h3>
          <div className="demo-steps">
            <div className="demo-step">
              <div className="step-number">1</div>
              <div className="step-icon">📄</div>
              <h4>Upload Contract</h4>
              <p>Upload your rental contract PDF. We support Hebrew & English.</p>
            </div>
            <div className="demo-step">
              <div className="step-number">2</div>
              <div className="step-icon">🤖</div>
              <h4>AI Analysis</h4>
              <p>Our AI scans for risks, unfair terms, and legal issues.</p>
            </div>
            <div className="demo-step">
              <div className="step-number">3</div>
              <div className="step-icon">📊</div>
              <h4>Get Results</h4>
              <p>See risk score, issue explanations, and negotiation tips.</p>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card variant="glass" padding="lg" className="auth-card">
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <h3>Sign In</h3>
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">Sign In</Button>
              <p className="auth-switch">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setMode('register'); setError(''); }}>
                  Sign Up
                </button>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <h3>Create Account</h3>
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="Min 8 chars, uppercase, number"
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">Create Account</Button>
              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                  Sign In
                </button>
              </p>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirm}>
              <h3>Verify Email</h3>
              <p className="confirm-message">We sent a code to {tempEmail}</p>
              <Input
                label="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading} type="submit">Verify</Button>
            </form>
          )}
        </Card>

        {/* Features Grid */}
        <div className="features-section">
          <Card variant="elevated" padding="md">
            <h4>🤖 AI Analysis</h4>
            <p>Powered by Amazon Bedrock AI to analyze contracts like a legal expert</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>🔒 Privacy First</h4>
            <p>Personal data (ID, phone, email) is auto-redacted before analysis</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>💡 Smart Tips</h4>
            <p>Get specific negotiation advice for each problematic clause</p>
          </Card>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>
            Built with ❤️ by{' '}
            <a href="https://github.com/RonPiece" target="_blank" rel="noopener noreferrer">Ron</a>
            {' & '}
            <a href="https://github.com/MoTy" target="_blank" rel="noopener noreferrer">Moty</a>
            {' | Cloud Computing Final Project'}
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
        <p>Loading RentGuard 360...</p>
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
