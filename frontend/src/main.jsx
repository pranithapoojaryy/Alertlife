import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PWA Mobile Crash Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem 1.25rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#0b0f19', color: '#fff' }}>
          <span style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Alert Life Responder</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', maxWidth: '320px', marginBottom: '1.5rem' }}>
            The app encountered a cache or initialization issue while launching.
          </p>
          <button 
            onClick={this.handleReset}
            style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            🔄 Clean Cache & Reload Portal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
