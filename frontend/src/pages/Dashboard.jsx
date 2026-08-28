import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard({ user, onLogout }) {
  const isMobile = user?.role === 'citizen' || user?.role === 'volunteer';

  // State Management
  const [activeTab, setActiveTab] = useState(isMobile ? 'sos' : 'monitor');
  const [sosDescription, setSosDescription] = useState('');
  const [sosState, setSosState] = useState(api.getActiveSOS());
  const [profile, setProfile] = useState(api.getProfile());
  const [radius, setRadius] = useState(api.getRadius());

  // Directory & Lists
  const [webinars, setWebinars] = useState([]);
  const [articles, setArticles] = useState([]);
  const [members, setMembers] = useState([]);
  const [casesHistory, setCasesHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Simulated GPS route tracking
  const [navProgress, setNavProgress] = useState(0);

  // Call simulator controls
  const [callMuted, setCallMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // Forms
  const [volunteerNotes, setVolunteerNotes] = useState('');
  const [newWebinar, setNewWebinar] = useState({ title: '', speaker: '', date: '' });
  const [newArticle, setNewArticle] = useState({ title: '', category: 'Guides', readTime: '5 min read', content: '' });

  // Sync state on intervals
  useEffect(() => {
    const fetchData = () => {
      setSosState(api.getActiveSOS());
      api.getWebinars().then(data => setWebinars(data));
      api.getArticles().then(data => setArticles(data));
      api.getMembers().then(data => setMembers(data));
      setCasesHistory(api.getCasesHistory());
    };
    fetchData();
    const interval = setInterval(fetchData, 1500);
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

  // Citizen SOS Trigger
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
    setTimeout(() => {
      api.updateSOS({ status: 'matched' });
    }, 2000);
  };

  // Volunteer Operations
  const acceptSOS = () => {
    const active = api.updateSOS({
      status: 'accepted',
      volunteerId: 'vol-1'
    });
    setSosState(active);
  };

  const triggerAmbulance = () => {
    api.updateSOS({
      status: 'hospital_notified',
      hospitalId: 'hosp-1',
      ambulanceStatus: 'requested'
    });
  };

  const startDoctorConsult = () => {
    api.updateSOS({ consultationActive: true });
  };

  const endDoctorConsult = () => {
    api.updateSOS({ consultationActive: false });
  };

  const submitVolunteerReport = (e) => {
    e.preventDefault();
    api.updateSOS({ volunteerNotes });
    api.closeSOS();
    setSosState(null);
    setVolunteerNotes('');
    setNavProgress(0);
  };

  // Hospital Desk
  const dispatchAmbulance = () => {
    api.updateSOS({
      ambulanceStatus: 'dispatched',
      ambulanceEta: '6 mins'
    });
  };

  // Admin Events
  const handleAddWebinar = (e) => {
    e.preventDefault();
    if (!newWebinar.title || !newWebinar.speaker || !newWebinar.date) return;
    api.addWebinar(newWebinar);
    setNewWebinar({ title: '', speaker: '', date: '' });
    alert('Webinar Event Scheduled!');
  };

  const handleAddArticle = (e) => {
    e.preventDefault();
    if (!newArticle.title || !newArticle.content) return;
    api.addArticle(newArticle);
    setNewArticle({ title: '', category: 'Guides', readTime: '5 min read', content: '' });
    alert('First Aid Guide Published!');
  };

  // -------------------------------------------------------------
  // MOBILE PWA LAYOUTS (Citizen or Volunteer)
  // -------------------------------------------------------------
  if (isMobile) {
    return (
      <div className="mobile-layout">
        {/* Mobile Sticky Header */}
        <header className="mobile-header">
          <div className="mobile-logo">
            <span>🚨</span> Alert Life PWA
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{user.role}</span>
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-content">
          {/* Active Banner */}
          {sosState && (
            <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--red)', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span>🚨 Active SOS request: <strong>{sosState.description}</strong> ({sosState.status})</span>
              {user.role === 'citizen' && (
                <button className="btn btn-outline btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => api.closeSOS()}>Cancel</button>
              )}
            </div>
          )}

          {/* CITIZEN VIEWS */}
          {user.role === 'citizen' && (
            <>
              {activeTab === 'sos' && (
                <div>
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <h3 className="card-title">🚨 Urgent Emergency</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      Tap the SOS button to alert all certified responders within {radius} km.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Describe Condition</label>
                      <input type="text" className="form-input" placeholder="e.g. Chest pain, Breathing trouble" value={sosDescription} onChange={e => setSosDescription(e.target.value)} disabled={sosState} />
                    </div>
                    <div className="sos-button-container">
                      <button className="sos-pulse-button" onClick={handleTriggerSOS} disabled={sosState}>
                        SOS
                        <span>{sosState ? 'CALL ACTIVE' : 'TAP TO ALERT'}</span>
                      </button>
                    </div>
                  </div>

                  {sosState && (
                    <div className="card">
                      <h3 className="card-title">📡 Dispatch Tracker</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Responder Lock:</span>
                          <strong>{sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Status:</span>
                          <span className="badge badge-red">{sosState.status}</span>
                        </div>
                        {sosState.volunteerId && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>First Responder:</span>
                            <strong>David Miller (Verified)</strong>
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
                          <div className="map-simulation">
                            <div className="map-grid-lines" />
                            <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                              <circle cx="50" cy="270" r="8" fill="var(--blue)" />
                              <circle cx="280" cy="80" r="8" fill="var(--red)" />
                              <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="4" className="map-route-line" />
                            </svg>
                          </div>
                          <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                            Volunteer is heading to your location. Progress: <strong>{navProgress}%</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="card">
                  <h3 className="card-title">📋 Medical Info Card</h3>
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
                      <label className="form-label">Allergies</label>
                      <input type="text" className="form-input" value={profile.allergies} onChange={e => setProfile({...profile, allergies: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Medical History</label>
                      <textarea className="form-textarea" rows="2" value={profile.medicalHistory} onChange={e => setProfile({...profile, medicalHistory: e.target.value})} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Update Card</button>
                  </form>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="card">
                  <h3 className="card-title">👥 Network Directory</h3>
                  <div className="form-group">
                    <input type="text" className="form-input" placeholder="🔍 Search members..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {members
                      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.role.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(m => (
                        <div key={m.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <div>
                            <strong>{m.name}</strong>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{m.phone || 'No phone'}</p>
                          </div>
                          <span className={`badge ${m.role === 'Volunteer' ? 'badge-blue' : 'badge-emerald'}`}>{m.role}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="card">
                    <h3 className="card-title">📚 Interactive Guides</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <p><strong>1. Verify Conscious State:</strong> Shout and tap shoulders.</p>
                      <p><strong>2. Call for Defibrillator (AED):</strong> Inform bystanders.</p>
                      <p><strong>3. Chest Compressions:</strong> Compress 2 inches deep at 110 beats/min.</p>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="card-title">📅 Awareness Webinars</h3>
                    {webinars.map(w => (
                      <div key={w.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <strong>{w.title}</strong>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Speaker: {w.speaker}</p>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', marginTop: '0.5rem' }} onClick={() => handleRegisterWebinar(w.id)}>Register</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* VOLUNTEER VIEWS */}
          {user.role === 'volunteer' && (
            <>
              {activeTab === 'sos' && (
                <div>
                  <div className="card" style={{ marginBottom: '1rem' }}>
                    <h3 className="card-title">🙋 Duty Control Board</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Registered: <strong>David Miller</strong>. You are currently active and ready to receive emergency dispatches.
                    </p>
                  </div>

                  {sosState && (sosState.status === 'matched' || sosState.status === 'locating') && (
                    <div className="card" style={{ border: '2px solid var(--red)' }}>
                      <h3 className="card-title" style={{ color: 'var(--red)' }}>🚨 INCOMING EMERGENCY REQUEST</h3>
                      <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                        <p><strong>Condition:</strong> {sosState.description}</p>
                        <p><strong>Patient:</strong> {sosState.patientName}</p>
                        <p><strong>Phone:</strong> {sosState.patientPhone}</p>
                      </div>
                      <button className="btn btn-danger" style={{ width: '100%' }} onClick={acceptSOS}>Accept & Dispatch</button>
                    </div>
                  )}

                  {sosState && sosState.volunteerId === 'vol-1' && (
                    <div className="card">
                      <h3 className="card-title">🧭 Live Navigation Map</h3>
                      <div className="map-simulation" style={{ marginBottom: '0.75rem' }}>
                        <div className="map-grid-lines" />
                        <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                          <circle cx="50" cy="270" r="8" fill="var(--blue)" />
                          <circle cx="280" cy="80" r="8" fill="var(--red)" />
                          <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="4" className="map-route-line" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span>Progress: {navProgress}%</span>
                        <span>ETA: 3 mins</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="card">
                  <h3 className="card-title">🩺 Live First-Aid Operations</h3>
                  {sosState && sosState.volunteerId === 'vol-1' ? (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={triggerAmbulance}>🚑 Call Ambulance</button>
                        <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={startDoctorConsult}>📞 Consult Doctor</button>
                      </div>

                      {sosState.consultationActive && (
                        <div className="call-simulator" style={{ marginBottom: '1rem' }}>
                          <div className="video-feed">
                            <span className="video-avatar">🥼</span>
                          </div>
                          <div className="call-controls">
                            <button className="btn btn-outline" onClick={() => setCallMuted(!callMuted)}>{callMuted ? '🎙️ Unmute' : '🎙️ Mute'}</button>
                            <button className="btn btn-danger" onClick={endDoctorConsult}>End</button>
                          </div>
                        </div>
                      )}

                      <form onSubmit={submitVolunteerReport} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">First-Aid Treatment Notes</label>
                          <textarea className="form-textarea" rows="2" placeholder="e.g. Performed chest compressions..." value={volunteerNotes} onChange={e => setVolunteerNotes(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>Submit Case Report</button>
                      </form>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Vitals and emergency controls will unlock when you accept a request.</p>
                  )}
                </div>
              )}

              {activeTab === 'education' && (
                <div className="card">
                  <h3 className="card-title">📚 Training Material</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                    {articles.map(art => (
                      <div key={art.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <strong>{art.title}</strong>
                        <p style={{ color: 'var(--text-secondary)' }}>{art.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
          <button className={`nav-tab ${activeTab === 'sos' ? 'active' : ''}`} onClick={() => setActiveTab('sos')}>
            <span className="nav-tab-icon">🚨</span>
            SOS Dashboard
          </button>
          <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-tab-icon">📋</span>
            {user.role === 'citizen' ? 'Medical Card' : 'Interventions'}
          </button>
          {user.role === 'citizen' && (
            <button className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              <span className="nav-tab-icon">👥</span>
              Directory
            </button>
          )}
          <button className={`nav-tab ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
            <span className="nav-tab-icon">📚</span>
            Education
          </button>
        </nav>
      </div>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP ADMIN / STAFF LAYOUT
  // -------------------------------------------------------------
  return (
    <div className="desktop-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>🚨</span> Alert Life Desk
        </div>
        <div className="sidebar-menu">
          <button className={`menu-item ${activeTab === 'monitor' ? 'active' : ''}`} onClick={() => setActiveTab('monitor')}>
            👑 Active Monitor
          </button>
          <button className={`menu-item ${activeTab === 'ambulance' ? 'active' : ''}`} onClick={() => setActiveTab('ambulance')}>
            🚑 Ambulance Desk
          </button>
          <button className={`menu-item ${activeTab === 'telehealth' ? 'active' : ''}`} onClick={() => setActiveTab('telehealth')}>
            🥼 Doctor Consults
          </button>
          <button className={`menu-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            📅 Content & Events
          </button>
          <button className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            ⚙️ System Config
          </button>
        </div>
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <p>Logged in: <strong>{user.name}</strong> ({user.role})</p>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.75rem', padding: '0.35rem' }} onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Management Console</h2>

        {activeTab === 'monitor' && (
          <div>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Saves</p>
                <h2>12,840</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verified Responders</p>
                <h2>4,839</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Response Time</p>
                <h2 style={{ color: 'var(--red)' }}>2m 45s</h2>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">📜 System Active Case Monitor</h3>
              {sosState ? (
                <div style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px' }}>
                  <p><strong>Patient:</strong> {sosState.patientName}</p>
                  <p><strong>Description:</strong> {sosState.description}</p>
                  <p><strong>Status:</strong> <span className="badge badge-red">{sosState.status}</span></p>
                  <p><strong>Ambulance Requested:</strong> {sosState.ambulanceStatus || 'No'}</p>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No active emergency cases currently reported.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ambulance' && (
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">🚑 Pending Dispatches</h3>
              {sosState && sosState.ambulanceStatus === 'requested' ? (
                <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px' }}>
                  <p><strong>Request location:</strong> {sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</p>
                  <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={dispatchAmbulance}>
                    Confirm and Dispatch Ambulance
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No pending ambulance requests.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'telehealth' && (
          <div className="card">
            <h3 className="card-title">🥼 Telehealth Doctor Console</h3>
            {sosState && sosState.consultationActive ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginTop: '1rem' }}>
                <div className="call-simulator" style={{ height: '350px' }}>
                  <div className="video-feed" style={{ height: '100%', position: 'relative' }}>
                    <span style={{ fontSize: '1rem', color: 'white', position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(0,0,0,0.6)', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                      🟢 Live Telehealth Call: {sosState.patientName}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="card" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                    <h4>📊 Live Vitals Stream</h4>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Heart Rate: <strong>88 bpm</strong></p>
                    <p style={{ fontSize: '0.85rem' }}>Blood Oxygen: <strong>97%</strong></p>
                    <p style={{ fontSize: '0.85rem' }}>Blood Group: <strong>{sosState.patientBlood}</strong></p>
                  </div>
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={endDoctorConsult}>
                    End Telehealth Call
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No active telehealth consultations requested.</p>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">📅 Schedule Awareness Webinar</h3>
              <form onSubmit={handleAddWebinar}>
                <div className="form-group">
                  <label className="form-label">Webinar Topic</label>
                  <input type="text" className="form-input" placeholder="e.g. Stroke Triage Steps" value={newWebinar.title} onChange={e => setNewWebinar({...newWebinar, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Speaker</label>
                  <input type="text" className="form-input" placeholder="Speaker name" value={newWebinar.speaker} onChange={e => setNewWebinar({...newWebinar, speaker: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date & Time</label>
                  <input type="datetime-local" className="form-input" value={newWebinar.date} onChange={e => setNewWebinar({...newWebinar, date: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Webinar</button>
              </form>
            </div>

            <div className="card">
              <h3 className="card-title">📖 Upload First Aid Guide</h3>
              <form onSubmit={handleAddArticle}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" placeholder="e.g. CPR Hands placement" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea className="form-textarea" rows="4" placeholder="Description of treatment steps..." value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Article</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: '500px' }}>
            <h3 className="card-title">⚙️ Global System Configuration</h3>
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Default Emergency Search Radius: <strong>{radius} km</strong></label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={radius}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setRadius(val);
                  import('../services/api').then(({ api: apiObj }) => {
                    apiObj.updateRadius?.(val);
                  });
                }}
                style={{ width: '100%', marginTop: '0.5rem' }}
              />
            </div>
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4>🔐 Access Keys</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                MongoDB Connection status: <span className="badge badge-emerald">Connected</span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
