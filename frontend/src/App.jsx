import React from 'react';
import { ThemeToggle } from './components/Toggle';
import Button from './components/Button';
import Card from './components/Card';
import Input from './components/Input';
import './styles/design-system.css';
import './App.css';

function App() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <div className="app-container">
      {/* Header with Theme Toggle */}
      <header className="app-header">
        <div className="header-content">
          <h1>🛡️ RentGuard 360</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Hero Section */}
        <section className="hero-section animate-fadeIn">
          <h2>AI-Powered Lease Analysis</h2>
          <p className="hero-subtitle">
            Your smart guardian for rental contracts. Upload, analyze, and negotiate with confidence.
          </p>
        </section>

        {/* Components Showcase */}
        <div className="showcase-grid">
          {/* Card 1: Welcome */}
          <Card variant="glass" padding="lg" hoverable className="animate-slideUp">
            <h3>Welcome to RentGuard 360</h3>
            <p style={{ marginTop: '12px', marginBottom: '24px' }}>
              Upload your lease contract and get instant AI-powered analysis, risk assessment, and negotiation suggestions.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="primary">Upload Contract</Button>
              <Button variant="secondary">Learn More</Button>
            </div>
          </Card>

          {/* Card 2: Button Variants */}
          <Card variant="elevated" padding="lg" className="animate-slideUp" style={{ animationDelay: '100ms' }}>
            <h4>Button Variants</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <Button variant="primary" fullWidth>Primary Button</Button>
              <Button variant="secondary" fullWidth>Secondary Button</Button>
              <Button variant="ghost" fullWidth>Ghost Button</Button>
              <Button variant="danger" fullWidth>Danger Button</Button>
              <Button variant="primary" loading fullWidth>Loading...</Button>
            </div>
          </Card>

          {/* Card 3: Input Fields */}
          <Card variant="elevated" padding="lg" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
            <h4>Form Example</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <Input
                type="email"
                label="Email Address"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button variant="primary" fullWidth>Sign In</Button>
            </div>
          </Card>

          {/* Card 4: Features */}
          <Card variant="glass" padding="lg" className="animate-slideUp" style={{ animationDelay: '300ms' }}>
            <h4>🎯 Key Features</h4>
            <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
              <li>AI-powered contract analysis</li>
              <li>Risk assessment & benchmarking</li>
              <li>Negotiation coach suggestions</li>
              <li>Privacy protection</li>
              <li>Smart notifications</li>
            </ul>
          </Card>
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <p>RentGuard 360 - Built with ❤️ by AI-Lawyers Team</p>
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: '0.7' }}>
            Ron & Moti | Cloud Computing Final Project
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
