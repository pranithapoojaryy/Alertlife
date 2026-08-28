import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';

function App() {
  // Helper to read the current role from environment variables or query params (?portal=volunteer or ?portal=admin)
  const getPortalRole = () => {
    // 1. Check Vite Environment Variable (for separate Vercel project deployments)
    if (import.meta.env.VITE_PORTAL) {
      const envRole = import.meta.env.VITE_PORTAL.toLowerCase();
      if (envRole === 'volunteer' || envRole === 'admin' || envRole === 'citizen') {
        return envRole;
      }
    }
    // 2. Fallback to URL search query (for local dev testing on a single port)
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal') || '';
    if (portal.toLowerCase() === 'volunteer') return 'volunteer';
    if (portal.toLowerCase() === 'admin') return 'admin';
    return 'citizen'; // Default portal
  };

  const currentRole = getPortalRole();

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState('login'); // login or register
  const [loginEmail, setLoginEmail] = useState('');
  const [regForm, setRegForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    bloodGroup: 'O+', 
    password: '' 
  });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail) return;
    
    if (loginEmail.toLowerCase().includes('@')) {
      const userData = {
        email: loginEmail,
        name: loginEmail.split('@')[0],
        role: currentRole
      };
      localStorage.setItem('user_session', JSON.stringify(userData));
      setUser(userData);
      setError('');
    } else {
      setError('Please enter a valid email address.');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.phone) {
      setError('All fields are required.');
      return;
    }
    
    const userData = {
      email: regForm.email,
      name: regForm.name,
      role: currentRole
    };
    localStorage.setItem('user_session', JSON.stringify(userData));

    // Sync mock profile name
    import('./services/api').then(({ api }) => {
      api.updateProfile({
        name: regForm.name,
        email: regForm.email,
        phone: regForm.phone,
        bloodGroup: regForm.bloodGroup
      });
    });
    setUser(userData);
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setUser(null);
  };

  // Helper for text headers based on the active portal URL
  const getPortalInfo = () => {
    if (currentRole === 'volunteer') {
      return { title: 'Volunteer Network', subtitle: 'First Responder Dispatch App' };
    }
    if (currentRole === 'admin') {
      return { title: 'Admin Console', subtitle: 'Emergency Response Management Site' };
    }
    return { title: 'Alert Life', subtitle: 'Citizen Emergency SOS PWA' };
  };

  const portalInfo = getPortalInfo();

  if (!user) {
    return (
      <div className="mobile-auth-container">
        <div className="mobile-auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>🚨</span>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>{portalInfo.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{portalInfo.subtitle}</p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--red)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--red)', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {authView === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="Enter your email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Sign In to {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Portal
              </button>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => setAuthView('register')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}>
                  Sign Up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="John Doe" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="john@example.com" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" placeholder="+1 (555) 000-0000" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} required />
              </div>
              {currentRole === 'citizen' && (
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={regForm.bloodGroup} onChange={e => setRegForm({...regForm, bloodGroup: e.target.value})}>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Register as {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => setAuthView('login')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}>
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dashboard user={user} onLogout={handleLogout} />
  );
}

export default App;
