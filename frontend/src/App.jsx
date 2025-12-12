import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeToggle } from './components/Toggle';
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ContractsPage from './pages/ContractsPage';
import AnalysisPage from './pages/AnalysisPage';
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

// Navigation Component
const Navigation = () => {
  const { logout, userAttributes } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="app-nav">
      <div className="nav-left">
        <Link to="/dashboard" className="nav-logo">🛡️ RentGuard 360</Link>
      </div>
      <div className="nav-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/upload" className="nav-link">Upload</Link>
        <Link to="/contracts" className="nav-link">Contracts</Link>
      </div>
      <div className="nav-right">
        <ThemeToggle />
        <span className="user-email">{userAttributes?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
      </div>
    </nav>
  );
};

// Landing/Login Page
const LandingPage = () => {
  const { login, register, confirmRegistration, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'confirm'
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

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>🛡️ RentGuard 360</h1>
        <ThemeToggle />
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <h2>AI-Powered Lease Analysis</h2>
          <p>Your smart guardian for rental contracts. Upload, analyze, and negotiate with confidence.</p>
        </div>

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
              <Button variant="primary" fullWidth loading={loading}>Sign In</Button>
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
                helperText="Min 8 characters with numbers and symbols"
              />
              {error && <p className="auth-error">{error}</p>}
              <Button variant="primary" fullWidth loading={loading}>Create Account</Button>
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
              <Button variant="primary" fullWidth loading={loading}>Verify</Button>
            </form>
          )}
        </Card>

        <div className="features-section">
          <Card variant="elevated" padding="md">
            <h4>🤖 AI Analysis</h4>
            <p>Powered by advanced AI</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>🔒 Privacy First</h4>
            <p>PII auto-redaction</p>
          </Card>
          <Card variant="elevated" padding="md">
            <h4>💡 Smart Tips</h4>
            <p>Negotiation advice</p>
          </Card>
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

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
        <Route path="/analysis/:contractId" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
      </Routes>
    </div>
  );
}

export default App;
