import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('citizen');
  const [sosDescription, setSosDescription] = useState('');
  const [sosState, setSosState] = useState(api.getActiveSOS());
  const [profile, setProfile] = useState(api.getProfile());
  const [volunteers, setVolunteers] = useState(api.getVolunteers());
  const [hospitals, setHospitals] = useState(api.getHospitals());
  const [doctors, setDoctors] = useState(api.getDoctors());
  const [radius, setRadius] = useState(api.getRadius());
  
  // Simulated navigation updates
  const [navProgress, setNavProgress] = useState(0); // 0 to 100%
  const [navTimer, setNavTimer] = useState(null);

  // Webinars & Articles
  const [webinars, setWebinars] = useState(api.getWebinars());
  const [articles, setArticles] = useState(api.getArticles());
  const [casesHistory, setCasesHistory] = useState(api.getCasesHistory());

  // Form states for Hospital additions
  const [newWebinar, setNewWebinar] = useState({ title: '', speaker: '', date: '' });
  const [newArticle, setNewArticle] = useState({ title: '', category: 'Guides', readTime: '5 min read', content: '' });

  // Doctor Call Controls
  const [callMuted, setCallMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // Volunteer form state
  const [volunteerNotes, setVolunteerNotes] = useState('');

  // Sync state with localstorage on intervals
  useEffect(() => {
    const interval = setInterval(() => {
      setSosState(api.getActiveSOS());
      setVolunteers(api.getVolunteers());
      setWebinars(api.getWebinars());
      setArticles(api.getArticles());
      setCasesHistory(api.getCasesHistory());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Citizen SOS Trigger
  const handleTriggerSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newSOS = api.triggerSOS({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            description: sosDescription
          });
          setSosState(newSOS);
          simulateDispatches();
        },
        () => {
          // Fallback location
          const newSOS = api.triggerSOS({
            lat: 37.7749,
            lng: -122.4194,
            description: sosDescription
          });
          setSosState(newSOS);
          simulateDispatches();
        }
      );
    }
  };

  const simulateDispatches = () => {
    setTimeout(() => {
      const active = api.updateSOS({ status: 'matched' });
      setSosState(active);
    }, 2000);
  };

  // Volunteer Actions
  const acceptSOS = () => {
    const active = api.updateSOS({
      status: 'accepted',
      volunteerId: 'vol-1' // David Miller accepts
    });
    setSosState(active);
    startSimulatedNavigation();
  };

  const startSimulatedNavigation = () => {
    setNavProgress(0);
    const interval = setInterval(() => {
      setNavProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          api.updateSOS({ status: 'arrived' });
          return 100;
        }
        return prev + 20;
      });
    }, 1500);
  };

  const triggerAmbulance = (hospitalId) => {
    const active = api.updateSOS({
      status: 'hospital_notified',
      hospitalId,
      ambulanceStatus: 'requested'
    });
    setSosState(active);
  };

  const startDoctorConsult = () => {
    const active = api.updateSOS({ consultationActive: true });
    setSosState(active);
  };

  const endDoctorConsult = () => {
    const active = api.updateSOS({ consultationActive: false });
    setSosState(active);
  };

  const submitVolunteerReport = (e) => {
    e.preventDefault();
    api.updateSOS({ volunteerNotes });
    api.closeSOS();
    setSosState(null);
    setVolunteerNotes('');
    setNavProgress(0);
  };

  // Hospital Actions
  const dispatchAmbulance = () => {
    const active = api.updateSOS({
      ambulanceStatus: 'dispatched',
      ambulanceEta: '7 mins'
    });
    setSosState(active);
  };

  const handleAddWebinar = (e) => {
    e.preventDefault();
    if (!newWebinar.title || !newWebinar.speaker || !newWebinar.date) return;
    api.addWebinar(newWebinar);
    setWebinars(api.getWebinars());
    setNewWebinar({ title: '', speaker: '', date: '' });
  };

  const handleAddArticle = (e) => {
    e.preventDefault();
    if (!newArticle.title || !newArticle.content) return;
    api.addArticle(newArticle);
    setArticles(api.getArticles());
    setNewArticle({ title: '', category: 'Guides', readTime: '5 min read', content: '' });
  };

  // Profile Edit
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    api.updateProfile(profile);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>🚨</span> Alert Life
        </div>
        <nav className="sidebar-menu">
          <button className={`menu-item ${activeTab === 'citizen' ? 'active' : ''}`} onClick={() => setActiveTab('citizen')}>
            👤 Citizen Portal
          </button>
          <button className={`menu-item ${activeTab === 'volunteer' ? 'active' : ''}`} onClick={() => setActiveTab('volunteer')}>
            🙋 Volunteer Center
          </button>
          <button className={`menu-item ${activeTab === 'hospital' ? 'active' : ''}`} onClick={() => setActiveTab('hospital')}>
            🏥 Hospital Console
          </button>
          <button className={`menu-item ${activeTab === 'doctor' ? 'active' : ''}`} onClick={() => setActiveTab('doctor')}>
            🥼 Doctor Dashboard
          </button>
          <button className={`menu-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            👑 System Admin
          </button>
          <button className={`menu-item ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
            📚 Learn & Events
          </button>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emergency Radius: <strong>{radius} km</strong></p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Active Emergency Bar Alert */}
        {sosState && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--red)', padding: '1rem 1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <span className="badge badge-red" style={{ marginRight: '0.75rem' }}>Active Alert</span>
              <strong>{sosState.description}</strong> for patient {sosState.patientName}. Status: <span style={{ textTransform: 'uppercase', color: 'var(--amber)' }}>{sosState.status}</span>
            </div>
            <button className="btn btn-outline btn-danger" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => { api.closeSOS(); setSosState(null); }}>
              Cancel SOS
            </button>
          </div>
        )}

        {/* Tab 1: Citizen Portal */}
        {activeTab === 'citizen' && (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="card-title">🚨 Trigger Emergency SOS</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  If you or someone near you needs critical medical help, input a short description and click the SOS button.
                </p>
                <div className="form-group">
                  <label className="form-label">Describe Emergency</label>
                  <input type="text" className="form-input" placeholder="e.g. Chest pain, difficulty breathing, car accident" value={sosDescription} onChange={e => setSosDescription(e.target.value)} />
                </div>
                
                <div className="sos-button-container">
                  <button className="sos-pulse-button" onClick={handleTriggerSOS} disabled={sosState && sosState.status !== 'closed'}>
                    SOS
                    <span>TAP TO REQUEST</span>
                  </button>
                </div>
              </div>

              {sosState && (
                <div className="card">
                  <h3 className="card-title">📡 Active Request Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>GPS Coordinates:</span>
                      <strong>{sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dispatch Status:</span>
                      <span className="badge badge-blue">{sosState.status}</span>
                    </div>
                    {sosState.volunteerId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Assigned Volunteer:</span>
                        <strong>David Miller (Verified)</strong>
                      </div>
                    )}
                    {sosState.ambulanceStatus && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Ambulance Status:</span>
                        <span className="badge badge-emerald">{sosState.ambulanceStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="card">
                <h3 className="card-title">📋 Medical Profile Card</h3>
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
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
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Update Profile Details</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Volunteer Center */}
        {activeTab === 'volunteer' && (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="card-title">🙋 Volunteer Control Board</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span>Duty Availability Status:</span>
                  <span className="badge badge-emerald">Active & Duty Ready</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  You are registered as David Miller. You will receive active emergency dispatch notifications for events within {radius} km of your location.
                </p>
              </div>

              {sosState && (sosState.status === 'matched' || sosState.status === 'locating') && (
                <div className="card" style={{ border: '2px solid var(--red)' }}>
                  <h3 className="card-title" style={{ color: 'var(--red)' }}>🚨 INCOMING EMERGENCY REQUEST</h3>
                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <p><strong>Description:</strong> {sosState.description}</p>
                    <p><strong>Patient:</strong> {sosState.patientName}</p>
                    <p><strong>Location:</strong> {sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</p>
                  </div>
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={acceptSOS}>
                    Accept and Respond
                  </button>
                </div>
              )}

              {sosState && sosState.volunteerId === 'vol-1' && (
                <div className="card">
                  <h3 className="card-title">🧭 Live Navigation Route</h3>
                  <div className="map-simulation" style={{ marginBottom: '1rem' }}>
                    <div className="map-grid-lines" />
                    <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                      <circle cx="50" cy="270" r="8" fill="var(--blue)" />
                      <text x="65" y="275" fill="#fff" fontSize="11" fontWeight="bold">You</text>
                      
                      <circle cx="280" cy="80" r="8" fill="var(--red)" />
                      <text x="295" y="85" fill="#fff" fontSize="11" fontWeight="bold">Patient</text>
                      
                      <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="4" className="map-route-line" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Distance: <strong>1.4 km</strong></span>
                    <span>ETA: <strong>3 mins</strong></span>
                    <span>Route progress: <strong>{navProgress}%</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div>
              {sosState && sosState.volunteerId === 'vol-1' && (
                <div className="card">
                  <h3 className="card-title">🩺 First Responder Operations</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Upon arriving at the scene, check patient vitals and follow dispatch protocols:
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => triggerAmbulance('hosp-1')}>
                      🚑 Call Ambulance
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={startDoctorConsult}>
                      📞 Consult Doctor
                    </button>
                  </div>

                  {sosState.consultationActive && (
                    <div className="call-simulator" style={{ marginBottom: '1rem' }}>
                      <div className="video-feed">
                        <span className="video-avatar">🥼</span>
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          Dr. Emily Johnson (Live)
                        </div>
                      </div>
                      <div className="call-controls">
                        <button className="btn btn-outline" onClick={() => setCallMuted(!callMuted)}>{callMuted ? '🎙️ Unmute' : '🎙️ Mute'}</button>
                        <button className="btn btn-outline" onClick={() => setCamOff(!camOff)}>{camOff ? '📹 Video On' : '📹 Video Off'}</button>
                        <button className="btn btn-danger" onClick={endDoctorConsult}>Disconnect</button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={submitVolunteerReport} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Emergency Intervention Notes</label>
                      <textarea className="form-textarea" rows="3" placeholder="Describe first-aid/CPR performed..." value={volunteerNotes} onChange={e => setVolunteerNotes(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                      Complete Case & Submit Report
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Hospital Console */}
        {activeTab === 'hospital' && (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="card-title">🏥 Ambulance Dispatch Desk</h3>
                {sosState && sosState.ambulanceStatus === 'requested' ? (
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--blue)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ marginBottom: '0.75rem' }}><strong>Ambulance Request</strong> for {sosState.patientName} ({sosState.description})</p>
                    <button className="btn btn-primary" onClick={dispatchAmbulance}>
                      Dispatch Nearest Ambulance
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No pending ambulance dispatch requests at this moment.</p>
                )}
              </div>

              <div className="card">
                <h3 className="card-title">📅 Schedule Health Awareness Event</h3>
                <form onSubmit={handleAddWebinar}>
                  <div className="form-group">
                    <label className="form-label">Session Topic</label>
                    <input type="text" className="form-input" placeholder="e.g. CPR Demonstration Basics" value={newWebinar.title} onChange={e => setNewWebinar({...newWebinar, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Speaker Name</label>
                    <input type="text" className="form-input" placeholder="Speaker name" value={newWebinar.speaker} onChange={e => setNewWebinar({...newWebinar, speaker: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input type="datetime-local" className="form-input" value={newWebinar.date} onChange={e => setNewWebinar({...newWebinar, date: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Awareness Program</button>
                </form>
              </div>
            </div>

            <div>
              <div className="card">
                <h3 className="card-title">📖 Upload First Aid Guide / Article</h3>
                <form onSubmit={handleAddArticle}>
                  <div className="form-group">
                    <label className="form-label">Guide Title</label>
                    <input type="text" className="form-input" placeholder="Guide title" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guide Content</label>
                    <textarea className="form-textarea" rows="5" placeholder="Step-by-step instructions..." value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish First Aid Guide</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Doctor Dashboard */}
        {activeTab === 'doctor' && (
          <div className="grid-2">
            <div>
              <div className="card">
                <h3 className="card-title">🥼 Consultation Calls Desk</h3>
                {sosState && sosState.consultationActive ? (
                  <div style={{ border: '2px solid var(--blue)', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ marginBottom: '1rem' }}>
                      <strong>Active Emergency Call</strong> from Volunteer David Miller for Patient {sosState.patientName}.
                    </p>
                    <div style={{ fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                      <p><strong>Patient Allergies:</strong> {sosState.patientAllergies || 'None'}</p>
                      <p><strong>Medical History:</strong> {sosState.patientHistory || 'None'}</p>
                      <p><strong>Blood Group:</strong> {sosState.patientBlood}</p>
                    </div>
                    <button className="btn btn-primary" onClick={endDoctorConsult} style={{ width: '100%' }}>
                      End Consultation
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active consultation requests.</p>
                )}
              </div>
            </div>
            
            <div>
              <div className="card">
                <h3 className="card-title">📋 Active Vitals Triage</h3>
                {sosState && sosState.consultationActive ? (
                  <div style={{ fontSize: '0.9rem' }}>
                    <p style={{ marginBottom: '0.5rem' }}>💓 Heart Rate: <strong style={{ color: 'var(--red)' }}>98 BPM</strong></p>
                    <p style={{ marginBottom: '0.5rem' }}>🩸 SpO2 level: <strong style={{ color: 'var(--emerald)' }}>96%</strong></p>
                    <p>🩸 BP: <strong>120/80 mmHg</strong></p>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>Vitals will be streamed here during live emergency calls.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Admin Panel */}
        {activeTab === 'admin' && (
          <div>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="card">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total System Saves</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--emerald)' }}>12,840</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Volunteers</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--blue)' }}>4,839</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg Response Time</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--red)' }}>2m 45s</h2>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 className="card-title">⚙️ Configure Search Radius</h3>
                <div className="form-group">
                  <label className="form-label">Alert Radius (Kilometers)</label>
                  <input type="number" step="0.1" className="form-input" value={radius} onChange={e => { setRadius(e.target.value); api.updateRadius(e.target.value); }} />
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">📜 Historical Emergency Cases</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {casesHistory.map((c, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', fontSize: '0.85rem' }}>
                      <p><strong>{c.description}</strong> ({new Date(c.timestamp).toLocaleDateString()})</p>
                      <p style={{ color: 'var(--text-secondary)' }}>Volunteer Notes: {c.volunteerNotes || 'None'}</p>
                    </div>
                  ))}
                  {casesHistory.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No completed cases yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Education & Events */}
        {activeTab === 'education' && (
          <div className="grid-2">
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 className="card-title">📚 Interactive CPR & First Aid Tutorial</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="card cpr-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <h4>Step 1: Check scene safety & responsiveness</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Tap the victim's shoulder, shout loudly "Are you OK?" to evaluate responsiveness.
                    </p>
                  </div>
                  <div className="card cpr-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <h4>Step 2: Position hands on chest center</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Interlock fingers and place heel of one hand in the center of the chest.
                    </p>
                  </div>
                  <div className="card cpr-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <h4>Step 3: Compress deep and fast</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Push down at least 2 inches at a rate of 100-120 compressions per minute to the beat of "Staying Alive".
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">📰 Emergency Awareness Articles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {articles.map((art) => (
                    <div key={art.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                      <span className="badge badge-blue" style={{ marginBottom: '0.25rem' }}>{art.category}</span>
                      <h4 style={{ margin: '0.25rem 0' }}>{art.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{art.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="card">
                <h3 className="card-title">📅 Online Webinars & Awareness Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {webinars.map((web) => (
                    <div key={web.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h4>{web.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>Hosted by: <strong>{web.speaker}</strong></p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date: {new Date(web.date).toLocaleString()}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem' }}>👥 {web.attendees} Registered</span>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => api.registerForWebinar(web.id)}>
                          Register
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
