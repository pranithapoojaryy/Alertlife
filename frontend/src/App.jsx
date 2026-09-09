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
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return { ...parsed, role: parsed.role || currentRole };
        }
      } catch {
        localStorage.removeItem('user_session');
      }
    }
    return null; // Require login/signup before opening Dashboard
  });

  // Listen to browser navigation and popstate to instantly sync portal
  useEffect(() => {
    const handleLocationChange = () => {
      const activeRole = getPortalRole();
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, role: activeRole };
      });
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
  const [loginPassword, setLoginPassword] = useState('');
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

  // Strictly Validate Exactly 10-Digit Mobile Number (starting with 6, 7, 8, 9)
  const isValidTenDigitPhone = (input) => {
    if (!input) return false;
    const digitsOnly = input.replace(/\D/g, '');
    return /^[6789]\d{9}$/.test(digitsOnly) && digitsOnly.length === 10;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedInput = loginEmail.trim();

    if (!trimmedInput) {
      setError('Please enter your email or 10-digit mobile number.');
      return;
    }
    
    const isEmail = trimmedInput.includes('@');
    if (!isEmail) {
      const digitsOnly = trimmedInput.replace(/\D/g, '');
      if (digitsOnly.length !== 10 || !/^[6789]\d{9}$/.test(digitsOnly)) {
        setError('Mobile number must be EXACTLY 10 digits starting with 6, 7, 8, or 9.');
        return;
      }
    }

    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    try {
      const { api } = await import('./services/api');
      const loggedUser = await api.login(trimmedInput, loginPassword);
      
      const userData = {
        email: loggedUser.email || (isEmail ? trimmedInput : `${trimmedInput.replace(/\D/g, '')}@alertlife.in`),
        phone: loggedUser.phone || (!isEmail ? trimmedInput : ''),
        name: loggedUser.name || trimmedInput.split('@')[0],
        role: loggedUser.role || currentRole
      };
      localStorage.setItem('user_session', JSON.stringify(userData));
      setUser(userData);
      setError('');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name?.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regForm.email?.trim() || !regForm.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    const phoneDigits = (regForm.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Phone number must be EXACTLY 10 digits.');
      return;
    }
    if (!/^[6789]\d{9}$/.test(phoneDigits)) {
      setError('10-digit mobile number must start with 6, 7, 8, or 9.');
      return;
    }
    if (!regForm.password || regForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const { api } = await import('./services/api');
      const regPayload = {
        name: regForm.name.trim(),
        email: regForm.email.toLowerCase().trim(),
        phone: phoneDigits,
        password: regForm.password,
        role: currentRole,
        bloodGroup: regForm.bloodGroup || 'O+'
      };

      const registeredUser = await api.register(regPayload);
      const userData = {
        email: registeredUser.email || regPayload.email,
        name: registeredUser.name || regPayload.name,
        role: currentRole
      };
      localStorage.setItem('user_session', JSON.stringify(userData));
      setUser(userData);
      setError('');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your data.');
    }
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
                <label className="form-label">Email or 10-Digit Mobile Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="name@email.com or 9876543210" 
                  value={loginEmail} 
                  onChange={e => {
                    const val = e.target.value;
                    // If typing pure digits, strictly cap at 10 numbers
                    if (/^\d+$/.test(val)) {
                      setLoginEmail(val.slice(0, 10));
                    } else {
                      setLoginEmail(val);
                    }
                  }} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
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
                <input type="text" className="form-input" placeholder="Rahul Sharma" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="rahul@example.in" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">10-Digit Mobile Number</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="9876543210" 
                  maxLength={10}
                  value={regForm.phone} 
                  onChange={e => {
                    const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setRegForm({...regForm, phone: onlyNums});
                  }} 
                  required 
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                  {regForm.phone ? `${regForm.phone.length}/10 digits` : 'Exactly 10 digits (starts with 6, 7, 8, 9)'}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Create password (min 6 characters)" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} required />
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
