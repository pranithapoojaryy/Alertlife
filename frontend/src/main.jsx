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

  handleReset = async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {
      console.warn('Cache clearing info:', e);
    }
    window.location.href = window.location.pathname + '?t=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem 1.25rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#0b0f19', color: '#fff' }}>
          <span style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Alert Life Responder</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', maxWidth: '360px', marginBottom: '1rem' }}>
            The app encountered a cache or initialization issue while launching.
          </p>
          {this.state.error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.75rem', color: '#fca5a5', maxWidth: '400px', marginBottom: '1.25rem', wordBreak: 'break-word', textAlign: 'left' }}>
              <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button 
            onClick={this.handleReset}
            style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
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
