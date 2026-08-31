import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';

function App() {
  // Helper to read the current role from environment variables, URL pathname, or query params
  const getPortalRole = () => {
    // 1. Check Vite Environment Variable (for separate Vercel project deployments)
    if (import.meta.env.VITE_PORTAL) {
      const envRole = import.meta.env.VITE_PORTAL.toLowerCase();
      if (envRole === 'volunteer' || envRole === 'admin' || envRole === 'citizen') {
        return envRole;
      }
    }
    // 2. Check URL pathname (e.g. /volunteer or /admin)
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('volunteer')) return 'volunteer';
    if (pathname.includes('admin')) return 'admin';
    // 3. Fallback to URL search query (?portal=volunteer or ?portal=admin)
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal') || '';
    if (portal.toLowerCase() === 'volunteer') return 'volunteer';
    if (portal.toLowerCase() === 'admin') return 'admin';
    return 'citizen'; // Default portal
  };

  const currentRole = getPortalRole();

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, role: currentRole };
    }
    return {
      name: currentRole === 'volunteer' ? 'David Miller' : currentRole === 'admin' ? 'Dr. Sarah Desk' : 'Jane Citizen',
      email: currentRole === 'volunteer' ? 'david@alertlife.org' : currentRole === 'admin' ? 'admin@alertlife.org' : 'jane@alertlife.com',
      role: currentRole
    };
  });

  // Listen to browser navigation and popstate to instantly sync portal
  useEffect(() => {
    const handleLocationChange = () => {
      const activeRole = getPortalRole();
      setUser(prev => ({
        name: activeRole === 'volunteer' ? 'David Miller' : activeRole === 'admin' ? 'Dr. Sarah Desk' : (prev?.name || 'Jane Citizen'),
        email: activeRole === 'volunteer' ? 'david@alertlife.org' : activeRole === 'admin' ? 'admin@alertlife.org' : (prev?.email || 'jane@alertlife.com'),
        role: activeRole
      }));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Dynamically update Tab Icon, Apple Touch Icon, and Title in React DOM
  useEffect(() => {
    const isVol = user?.role === 'volunteer';
    const iconHref = isVol ? '/volunteer-icon.svg' : '/favicon.svg';
    const manifestHref = isVol ? '/manifest-volunteer.json' : '/manifest.json';
    const themeColor = isVol ? '#10b981' : '#6366f1';
    
    document.title = isVol ? 'Alert Responder - Volunteer First Responder' : 'Alert Life - Emergency SOS';

    const favicons = document.querySelectorAll("link[rel*='icon']");
    favicons.forEach(el => el.setAttribute('href', iconHref));

    const manifest = document.querySelector("link[rel='manifest']");
    if (manifest) manifest.setAttribute('href', manifestHref);

    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme) metaTheme.setAttribute('content', themeColor);
  }, [user?.role]);

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

  const switchPortal = (newRole) => {
    const newUserData = {
      name: newRole === 'volunteer' ? 'David Miller' : newRole === 'admin' ? 'Dr. Sarah Desk' : 'Jane Citizen',
      email: newRole === 'volunteer' ? 'david@alertlife.org' : newRole === 'admin' ? 'admin@alertlife.org' : 'jane@alertlife.com',
      role: newRole
    };
    localStorage.setItem('user_session', JSON.stringify(newUserData));
    setUser(newUserData);
    const url = new URL(window.location);
    url.searchParams.set('portal', newRole);
    window.history.pushState({}, '', url);
  };

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
    if (user?.role === 'volunteer' || currentRole === 'volunteer') {
      return { title: 'Volunteer Network', subtitle: 'First Responder Dispatch App' };
    }
    if (user?.role === 'admin' || currentRole === 'admin') {
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
