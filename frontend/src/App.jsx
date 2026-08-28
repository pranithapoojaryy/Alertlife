import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState('login'); // login or register
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRole, setLoginRole] = useState('citizen');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', bloodGroup: 'O+', role: 'citizen', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail) return;
    
    if (loginEmail.toLowerCase().includes('@')) {
      const userData = {
        email: loginEmail,
        name: loginEmail.split('@')[0],
        role: loginRole
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
      role: regForm.role
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

  if (!user) {
    return (
      <div className="mobile-auth-container">
        <div className="mobile-auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '3rem' }}>🚨</span>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>Alert Life</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Emergency dispatch response network</p>
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
              <div className="form-group">
                <label className="form-label">Account Role</label>
                <select className="form-select" value={loginRole} onChange={e => setLoginRole(e.target.value)}>
                  <option value="citizen">👤 Citizen (Mobile PWA)</option>
                  <option value="volunteer">🙋 Volunteer (Mobile PWA)</option>
                  <option value="admin">👑 Admin Management Console (Desktop)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Sign In
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
              <div className="form-group">
                <label className="form-label">Account Role</label>
                <select className="form-select" value={regForm.role} onChange={e => setRegForm({...regForm, role: e.target.value})}>
                  <option value="citizen">👤 Citizen (Mobile PWA)</option>
                  <option value="volunteer">🙋 Volunteer (Mobile PWA)</option>
                  <option value="admin">👑 Admin Management Console (Desktop)</option>
                </select>
              </div>
              {regForm.role === 'citizen' && (
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={regForm.bloodGroup} onChange={e => setRegForm({...regForm, bloodGroup: e.target.value})}>
                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Create Account
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
