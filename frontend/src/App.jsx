import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';

function App() {
  // Helper to read the current role from environment variables, hostname, URL pathname, or query params
  const getPortalRole = () => {
    // 1. Check Vite Environment Variable (for separate Vercel project deployments)
    if (import.meta.env.VITE_PORTAL) {
      const envRole = import.meta.env.VITE_PORTAL.toLowerCase();
      if (['volunteer', 'hospital', 'admin', 'citizen'].includes(envRole)) {
        return envRole;
      }
    }
    // 2. Check Hostname (e.g. alertlife-volunteer.vercel.app, alertlife-hospital.vercel.app, alertlife-admin.vercel.app)
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('volunteer')) return 'volunteer';
    if (hostname.includes('hospital')) return 'hospital';
    if (hostname.includes('admin')) return 'admin';

    // 3. Check URL pathname (e.g. /volunteer, /hospital or /admin)
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('volunteer')) return 'volunteer';
    if (pathname.includes('hospital')) return 'hospital';
    if (pathname.includes('admin')) return 'admin';

    // 4. Fallback to URL search query (?portal=volunteer, ?portal=hospital, ?portal=admin)
    const params = new URLSearchParams(window.location.search);
    const portal = (params.get('portal') || '').toLowerCase();
    if (['volunteer', 'hospital', 'admin', 'citizen'].includes(portal)) return portal;

    return 'citizen'; // Default portal
  };

  const currentRole = getPortalRole();

  const [user, setUser] = useState(() => {
    const sessionKey = `user_session_${currentRole}`;
    const saved = localStorage.getItem(sessionKey) || localStorage.getItem('user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          return { ...parsed, role: currentRole };
        }
      } catch {
        localStorage.removeItem(sessionKey);
      }
    }
    return null; // Require login/signup before opening Dashboard
  });

  // Dynamically update Tab Icon, Apple Touch Icon, and Title in React DOM
  useEffect(() => {
    const isVol = currentRole === 'volunteer';
    const isHosp = currentRole === 'hospital';
    const isAdmin = currentRole === 'admin';
    const iconHref = isVol ? '/volunteer-icon.svg' : '/favicon.svg';
    const manifestHref = isVol ? '/manifest-volunteer.json' : '/manifest.json';
    const themeColor = isVol ? '#10b981' : isHosp ? '#ef4444' : isAdmin ? '#8b5cf6' : '#6366f1';
    
    document.title = isVol 
      ? 'Alert Responder - Volunteer First Responder' 
      : isHosp 
      ? 'Alert ER - Hospital & Ambulance Dispatch Console' 
      : isAdmin 
      ? 'Alert Command - Emergency Admin Console' 
      : 'Alert Life - Emergency SOS';

    const favicons = document.querySelectorAll("link[rel*='icon']");
    favicons.forEach(el => el.setAttribute('href', iconHref));

    const manifest = document.querySelector("link[rel='manifest']");
    if (manifest) manifest.setAttribute('href', manifestHref);

    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme) metaTheme.setAttribute('content', themeColor);
  }, [currentRole]);

  const [authView, setAuthView] = useState('login'); // login or register
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regForm, setRegForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    hospitalName: '',
    registrationNumber: '',
    bloodGroup: 'O+', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        role: currentRole
      };
      localStorage.setItem(`user_session_${currentRole}`, JSON.stringify(userData));
      setUser(userData);
      setError('');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name?.trim()) {
      setError(currentRole === 'hospital' ? 'Please enter Hospital Name.' : 'Please enter your full name.');
      return;
    }
    if (!regForm.email?.trim() || !regForm.email.includes('@')) {
      setError('Please enter a valid official email address.');
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
        hospitalName: currentRole === 'hospital' ? regForm.name.trim() : undefined,
        registrationNumber: currentRole === 'hospital' ? (regForm.registrationNumber || `HOSP-REG-${Date.now().toString().slice(-6)}`) : undefined,
        bloodGroup: regForm.bloodGroup || 'O+'
      };

      await api.register(regPayload);
      
      // Do NOT auto-login. Pre-fill login credentials and switch to Login view
      setLoginEmail(regPayload.email);
      setLoginPassword('');
      setRegForm({ name: '', email: '', phone: '', hospitalName: '', registrationNumber: '', bloodGroup: 'O+', password: '' });
      setError('');
      setSuccessMsg(`Registration successful! Please sign in with your email (${regPayload.email}) or phone number to open the ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} portal.`);
      setAuthView('login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your data.');
      setSuccessMsg('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`user_session_${currentRole}`);
    localStorage.removeItem('user_session');
    setUser(null);
    setSuccessMsg('');
    setError('');
  };

  // Helper for text headers based on the active portal URL
  const getPortalInfo = () => {
    if (currentRole === 'volunteer') {
      return { title: 'Volunteer Network', subtitle: 'First Responder Dispatch App', icon: '🟢', badge: 'Certified First Responder' };
    }
    if (currentRole === 'hospital') {
      return { title: 'Hospital ER Desk', subtitle: 'Ambulance & Emergency Response Dispatch Portal', icon: '🏥', badge: 'Emergency Department' };
    }
    if (currentRole === 'admin') {
      return { title: 'Admin Console', subtitle: 'Emergency Response Management Site', icon: '🛡️', badge: 'System Administration' };
    }
    return { title: 'Alert Life', subtitle: 'Citizen Emergency SOS PWA', icon: '🚨', badge: 'Public Safety' };
  };

  const portalInfo = getPortalInfo();

  if (!user) {
    return (
      <div className="mobile-auth-container">
        <div className="mobile-auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>{portalInfo.icon}</span>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>{portalInfo.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{portalInfo.subtitle}</p>
          </div>

          {successMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--emerald)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--emerald)', marginBottom: '1rem' }}>
              ✓ {successMsg}
            </div>
          )}

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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showLoginPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)} 
                    style={{ paddingRight: '2.5rem' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.05rem',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      opacity: 0.85
                    }}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Sign In to {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Portal
              </button>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthView('register'); setError(''); setSuccessMsg(''); }} 
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign Up
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">{currentRole === 'hospital' ? 'Hospital / Clinic Official Name' : 'Full Name'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={currentRole === 'hospital' ? "e.g. Apollo Super Specialty Hospital" : "Rahul Sharma"} 
                  value={regForm.name} 
                  onChange={e => setRegForm({...regForm, name: e.target.value})} 
                  required 
                />
              </div>
              {currentRole === 'hospital' && (
                <div className="form-group">
                  <label className="form-label">Medical Registration / License Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. HOSP-KA-2024-8842" 
                    value={regForm.registrationNumber} 
                    onChange={e => setRegForm({...regForm, registrationNumber: e.target.value})} 
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{currentRole === 'hospital' ? 'Official Hospital ER Email' : 'Email Address'}</label>
                <input type="email" className="form-input" placeholder={currentRole === 'hospital' ? "er-desk@apollo.org" : "rahul@example.in"} value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">{currentRole === 'hospital' ? '24/7 Emergency Dispatch Helpline Phone' : '10-Digit Mobile Number'}</label>
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
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showRegPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="Create password (min 6 characters)" 
                    value={regForm.password} 
                    onChange={e => setRegForm({...regForm, password: e.target.value})} 
                    style={{ paddingRight: '2.5rem' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.05rem',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      opacity: 0.85
                    }}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              {currentRole === 'citizen' && (
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={regForm.bloodGroup} onChange={e => setRegForm({...regForm, bloodGroup: e.target.value})}>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', background: currentRole === 'hospital' ? 'var(--red)' : undefined }}>
                Register as {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthView('login'); setError(''); setSuccessMsg(''); }} 
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }}
                >
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
