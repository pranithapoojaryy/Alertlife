import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('sos'); // sos, profile, education
  const [sosDescription, setSosDescription] = useState('');
  const [sosState, setSosState] = useState(api.getActiveSOS());
  const [profile, setProfile] = useState(api.getProfile());
  const [radius, setRadius] = useState(api.getRadius());

  // Webinars & Articles
  const [webinars, setWebinars] = useState(api.getWebinars());
  const [articles, setArticles] = useState(api.getArticles());

  // Simulated GPS route tracking
  const [navProgress, setNavProgress] = useState(0);

  // Sync state on intervals
  useEffect(() => {
    const interval = setInterval(() => {
      const active = api.getActiveSOS();
      setSosState(active);
      setWebinars(api.getWebinars());
      setArticles(api.getArticles());
      setProfile(api.getProfile());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle volunteer navigation updates
  useEffect(() => {
    if (sosState && sosState.status === 'accepted') {
      const interval = setInterval(() => {
        setNavProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            api.updateSOS({ status: 'arrived' });
            return 100;
          }
          return prev + 25;
        });
      }, 2000);
      return () => clearInterval(interval);
    } else if (!sosState) {
      setNavProgress(0);
    }
  }, [sosState?.status]);

  // Trigger SOS Alert
  const handleTriggerSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newSOS = api.triggerSOS({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            description: sosDescription || "Medical Emergency"
          });
          setSosState(newSOS);
          simulateDispatches();
        },
        () => {
          // Fallback coordinates
          const newSOS = api.triggerSOS({
            lat: 37.7749,
            lng: -122.4194,
            description: sosDescription || "Medical Emergency"
          });
          setSosState(newSOS);
          simulateDispatches();
        }
      );
    }
  };

  const simulateDispatches = () => {
    // Stage 1: locating -> matched
    setTimeout(() => {
      api.updateSOS({ status: 'matched' });
      
      // Stage 2: matched -> accepted (volunteer responds)
      setTimeout(() => {
        api.updateSOS({
          status: 'accepted',
          volunteerId: 'vol-1'
        });

        // Stage 3: accepted -> hospital_notified -> ambulance_dispatched
        setTimeout(() => {
          api.updateSOS({
            status: 'hospital_notified',
            hospitalId: 'hosp-1',
            ambulanceStatus: 'requested'
          });

          setTimeout(() => {
            api.updateSOS({
              ambulanceStatus: 'dispatched',
              ambulanceEta: '5 mins'
            });
          }, 3000);
        }, 5000);
      }, 3000);
    }, 2000);
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    api.updateProfile(profile);
    alert('Medical Profile Updated Successfully!');
  };

  const handleRegisterWebinar = (webId) => {
    api.registerForWebinar(webId);
    setWebinars(api.getWebinars());
    alert('You have registered for this webinar event! Check email for links.');
  };

  return (
    <div className="app-container">
      {/* Mobile Sticky Header */}
      <header className="mobile-header">
        <div className="mobile-logo">
          <span>🚨</span> Alert Life
        </div>
        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={onLogout}>
          Logout
        </button>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Tab 1: SOS Panel */}
        {activeTab === 'sos' && (
          <div>
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="card-title">🚨 Urgent Emergency Call</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Tap the SOS button to instantly summon certified responders within {radius} km.
              </p>
              <div className="form-group">
                <label className="form-label">Type of Emergency</label>
                <input type="text" className="form-input" placeholder="e.g. Chest pain, difficulty breathing" value={sosDescription} onChange={e => setSosDescription(e.target.value)} disabled={sosState} />
              </div>
              
              <div className="sos-button-container">
                <button className="sos-pulse-button" onClick={handleTriggerSOS} disabled={sosState}>
                  SOS
                  <span>{sosState ? 'DISPATCHED' : 'TAP TO ALERT'}</span>
                </button>
              </div>
            </div>

            {sosState && (
              <div className="card">
                <h3 className="card-title">📡 Live Response Telemetry</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Current Status:</span>
                    <span className="badge badge-red" style={{ textTransform: 'uppercase' }}>{sosState.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Location Lock:</span>
                    <strong>{sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</strong>
                  </div>
                  {sosState.volunteerId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>First Responder:</span>
                      <strong>David Miller (En Route)</strong>
                    </div>
                  )}
                  {sosState.ambulanceStatus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ambulance Status:</span>
                      <span className="badge badge-emerald">{sosState.ambulanceStatus} {sosState.ambulanceEta ? `(${sosState.ambulanceEta})` : ''}</span>
                    </div>
                  )}
                </div>

                {sosState.status === 'accepted' && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>🧭 Responder Navigation Map</h4>
                    <div className="map-simulation">
                      <div className="map-grid-lines" />
                      <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                        <circle cx="50" cy="270" r="8" fill="var(--blue)" />
                        <circle cx="280" cy="80" r="8" fill="var(--red)" />
                        <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="4" className="map-route-line" />
                      </svg>
                    </div>
                    <p style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                      Volunteer is en route. Distance: <strong>{(1.4 * (1 - navProgress/100)).toFixed(1)} km</strong> (ETA: <strong>{Math.ceil(3 * (1 - navProgress/100))} mins</strong>)
                    </p>
                  </div>
                )}

                <button className="btn btn-outline btn-danger" style={{ width: '100%', marginTop: '1.25rem' }} onClick={() => api.closeSOS()}>
                  Cancel Emergency Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Profile (Medical Card) */}
        {activeTab === 'profile' && (
          <div className="card">
            <h3 className="card-title">📋 Medical Profile Card</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Ensure this card is up-to-date. In an emergency, this data will be instantly shared with the dispatched volunteer.
            </p>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="text" className="form-input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})}>
                  {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Allergies Information</label>
                <input type="text" className="form-input" value={profile.allergies} onChange={e => setProfile({...profile, allergies: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Medical History</label>
                <textarea className="form-textarea" rows="3" value={profile.medicalHistory} onChange={e => setProfile({...profile, medicalHistory: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Medical Details
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Education & Webinars */}
        {activeTab === 'education' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <h3 className="card-title">📚 Interactive CPR Guide</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <p><strong>1. Verify Responsiveness</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tap shoulder, shout "Are you OK?" to check consciousness.</p>
                </div>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <p><strong>2. Perform Rapid Compressions</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Push hard and fast on the center of the chest (100-120/min).</p>
                </div>
                <div>
                  <p><strong>3. Use AED</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Apply automated external defibrillator as soon as available.</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">📅 Community Webinar Schedules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {webinars.map(web => (
                  <div key={web.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.95rem' }}>{web.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>Speaker: <strong>{web.speaker}</strong></p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {new Date(web.date).toLocaleString()}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem' }}>👥 {web.attendees} registered</span>
                      <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleRegisterWebinar(web.id)}>
                        Register
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Menu */}
      <nav className="bottom-nav">
        <button className={`nav-tab ${activeTab === 'sos' ? 'active' : ''}`} onClick={() => setActiveTab('sos')}>
          <span className="nav-tab-icon">🚨</span>
          SOS Alert
        </button>
        <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <span className="nav-tab-icon">📋</span>
          Medical Card
        </button>
        <button className={`nav-tab ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
          <span className="nav-tab-icon">📚</span>
          Education
        </button>
      </nav>
    </div>
  );
}
