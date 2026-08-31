import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard({ user, onLogout }) {
  const isMobile = user?.role === 'citizen' || user?.role === 'volunteer';

  // State Management
  const [activeTab, setActiveTab] = useState(isMobile ? 'sos' : 'monitor');
  const [sosDescription, setSosDescription] = useState('');
  const [sosState, setSosState] = useState(api.getActiveSOS());
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', bloodGroup: 'O+', allergies: 'None', medicalHistory: 'None' });
  const [radius, setRadius] = useState(api.getRadius());

  // Volunteer Specific Extended States
  const [dutyStatus, setDutyStatus] = useState('available');
  const [volProfile, setVolProfile] = useState({
    name: 'David Miller',
    email: 'david.miller@alertlife.org',
    phone: '+1 (555) 012-3456',
    certification: 'AHA Certified First Responder',
    certificationNumber: 'EMT-99410-X',
    skills: ['CPR (Adult/Pediatric)', 'AED Defibrillation', 'Tourniquet / Bleeding Control', 'EpiPen / Anaphylaxis', 'Choking Relief'],
    availabilityStatus: 'available',
    serviceRadius: 5,
    isVerified: true,
    totalEmergenciesHandled: 18,
    rating: 4.9,
    experience: 3,
    currentLocation: { latitude: 37.7749, longitude: -122.4194 }
  });
  const [isCprActive, setIsCprActive] = useState(false);
  const [cprBeats, setCprBeats] = useState(0);
  const [incidentLogs, setIncidentLogs] = useState(api.getIncidentHistory ? api.getIncidentHistory() : []);
  const [reportForm, setReportForm] = useState({
    condition: 'Stabilized / Awake',
    interventions: 'CPR 2 cycles, AED Shock delivered, Airway cleared',
    pulse: '84 bpm',
    bloodPressure: '122/82',
    notes: 'Citizen restored pulse within 3 minutes. Handed over to City General Ambulance unit.'
  });
  const [kitItems, setKitItems] = useState([
    { name: 'Pocket CPR Mask / Face Shield', checked: true },
    { name: 'Hemostatic Gauze & Pressure Bandages', checked: true },
    { name: 'Combat Application Tourniquet (CAT)', checked: true },
    { name: 'Medical Nitrile Gloves (3 pairs)', checked: true },
    { name: 'Trauma Shears & Antiseptic Wipes', checked: true },
    { name: 'Instant Cold Packs & Burn Dressings', checked: false },
    { name: 'Pulse Oximeter & Penlight', checked: true }
  ]);

  // Directory & Lists
  const [webinars, setWebinars] = useState([]);
  const [articles, setArticles] = useState([]);
  const [members, setMembers] = useState([]);
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

  // CPR Metronome audio click & counter simulation
  useEffect(() => {
    let metronomeInterval;
    if (isCprActive) {
      metronomeInterval = setInterval(() => {
        setCprBeats(prev => (prev >= 30 ? 1 : prev + 1));
      }, 545); // ~110 BPM (60000ms / 110 = 545ms)
    } else {
      setCprBeats(0);
    }
    return () => clearInterval(metronomeInterval);
  }, [isCprActive]);

  // Sync state on intervals
  useEffect(() => {
    // Fetch initial profile async
    api.getProfile().then(p => { if (p) setProfile(p); });
    if (api.getVolunteerProfile) {
      api.getVolunteerProfile().then(vp => {
        if (vp) {
          setVolProfile(vp);
          setDutyStatus(vp.availabilityStatus || 'available');
        }
      });
    }

    const fetchData = () => {
      setSosState(api.getActiveSOS());
      api.getWebinars().then(data => setWebinars(data || []));
      api.getArticles().then(data => setArticles(data || []));
      api.getMembers().then(data => setMembers(data || []));
      if (api.getIncidentHistory) {
        setIncidentLogs(api.getIncidentHistory() || []);
      }
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
  const handleStatusChange = (newStatus) => {
    setDutyStatus(newStatus);
    api.updateVolunteerAvailability(newStatus, volProfile.currentLocation?.latitude, volProfile.currentLocation?.longitude)
      .then(res => {
        if (res) setVolProfile(res);
      });
  };

  const toggleSkill = (skillName) => {
    const currentSkills = volProfile.skills || [];
    let updated;
    if (currentSkills.includes(skillName)) {
      updated = currentSkills.filter(s => s !== skillName);
    } else {
      updated = [...currentSkills, skillName];
    }
    setVolProfile({ ...volProfile, skills: updated });
  };

  const toggleKitItem = (index) => {
    setKitItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));
  };

  const handleSaveVolunteerProfile = (e) => {
    e.preventDefault();
    api.updateVolunteerProfile(volProfile).then(updated => {
      if (updated) setVolProfile(updated);
      alert('✓ Responder Credentials & Skills updated successfully!');
    });
  };

  const handleDetailedReportSubmit = (e) => {
    e.preventDefault();
    if (!reportForm.notes || !reportForm.interventions) {
      alert('Please fill out first aid interventions and responder notes.');
      return;
    }
    api.submitIncidentReport(sosState?.id, reportForm).then(() => {
      alert('✓ Incident report submitted. Mission logged to your history.');
      setSosState(null);
      setNavProgress(0);
      setIsCprActive(false);
      if (api.getIncidentHistory) {
        setIncidentLogs(api.getIncidentHistory());
      }
    });
  };

  const acceptSOS = () => {
    const active = api.updateSOS({
      status: 'accepted',
      volunteerId: 'vol-1',
      volunteerName: volProfile.name || 'David Miller',
      volunteerPhone: volProfile.phone || '+1 (555) 012-3456',
      volunteerCert: volProfile.certification || 'AHA Certified Responder'
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

  // Citizen Handlers
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    api.updateProfile(profile).then(() => alert('Profile saved!'));
  };

  const handleRegisterWebinar = (webId) => {
    api.registerForWebinar(webId).then(data => setWebinars(data || []));
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
            <span>🚨</span> Alert Life
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              className="form-select"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 600, width: 'auto', background: 'rgba(99, 102, 241, 0.08)', borderColor: 'var(--blue)' }}
              value={user.role}
              onChange={(e) => {
                const newRole = e.target.value;
                const newUserData = {
                  name: newRole === 'volunteer' ? 'David Miller' : newRole === 'admin' ? 'Dr. Sarah Desk' : 'Jane Citizen',
                  email: newRole === 'volunteer' ? 'david@alertlife.org' : newRole === 'admin' ? 'admin@alertlife.org' : 'jane@alertlife.com',
                  role: newRole
                };
                localStorage.setItem('user_session', JSON.stringify(newUserData));
                window.location.search = `?portal=${newRole}`;
              }}
            >
              <option value="citizen">👤 Citizen App</option>
              <option value="volunteer">🛡️ Volunteer Portal</option>
              <option value="admin">🏢 Admin Desk</option>
            </select>
            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }} onClick={onLogout}>
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
                      <h3 className="card-title">📡 Live Emergency Dispatch Tracker</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>GPS Pin:</span>
                          <strong>{sosState.lat?.toFixed(4)}, {sosState.lng?.toFixed(4)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Status:</span>
                          <span className={`badge ${sosState.status === 'arrived' ? 'badge-emerald' : sosState.status === 'accepted' ? 'badge-blue' : 'badge-red'}`}>
                            {sosState.status === 'arrived' ? 'RESPONDER ON SCENE' : sosState.status === 'accepted' ? 'RESPONDER EN ROUTE' : sosState.status}
                          </span>
                        </div>

                        {sosState.volunteerId && (
                          <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Assigned First Responder:</span>
                              <strong>{sosState.volunteerName || 'David Miller'} (Verified)</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Certification:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sosState.volunteerCert || 'AHA Certified First Responder'}</span>
                            </div>
                            {sosState.volunteerPhone && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Direct Contact:</span>
                                <a href={`tel:${sosState.volunteerPhone}`} style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                                  📞 {sosState.volunteerPhone}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {sosState.ambulanceStatus && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Ambulance Status:</span>
                            <span className="badge badge-emerald">
                              🚑 {sosState.ambulanceStatus} {sosState.ambulanceEta ? `(${sosState.ambulanceEta})` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {sosState.status === 'accepted' && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="map-simulation">
                            <div className="map-grid-lines" />
                            <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                              <circle cx="50" cy="270" r="8" fill="var(--blue)" />
                              <text x="65" y="275" fill="white" fontSize="10">Volunteer</text>
                              <circle cx="280" cy="80" r="8" fill="var(--red)" />
                              <text x="235" y="70" fill="white" fontSize="10">You</text>
                              <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="4" className="map-route-line" />
                            </svg>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.75rem' }}>
                            <div style={{ width: `${navProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--blue), var(--emerald))', transition: 'width 0.4s ease' }} />
                          </div>
                          <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                            First responder is navigating to your location. Progress: <strong>{navProgress}%</strong>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status & Readiness Bar */}
                  <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.08))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.35rem' }}>🛡️</span>
                          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{volProfile.name}</h3>
                          <span className={`badge ${volProfile.isVerified ? 'badge-emerald' : 'badge-amber'}`}>
                            {volProfile.isVerified ? '✓ Verified Responder' : 'Pending Verification'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Cert: <strong>{volProfile.certification}</strong> (#{volProfile.certificationNumber})
                        </p>
                      </div>

                      {/* Online/Offline Status Switcher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Duty Status:</span>
                        <select 
                          className="form-select" 
                          style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, borderColor: dutyStatus === 'available' ? 'var(--emerald)' : dutyStatus === 'busy' ? 'var(--amber)' : 'var(--text-muted)' }}
                          value={dutyStatus}
                          onChange={(e) => handleStatusChange(e.target.value)}
                        >
                          <option value="available">🟢 Available (On Duty)</option>
                          <option value="busy">🟡 Busy / On Call</option>
                          <option value="offline">⚪ Offline (Off Duty)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue)' }}>{volProfile.totalEmergenciesHandled || 18}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Emergencies Handled</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)' }}>⭐ {volProfile.rating || '4.9'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Quality Rating</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--amber)' }}>{volProfile.serviceRadius || 5} km</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Response Range</div>
                      </div>
                    </div>
                  </div>

                  {/* Incoming Emergency Dispatch Card */}
                  {sosState && (sosState.status === 'matched' || sosState.status === 'locating') && (
                    <div className="card" style={{ border: '2px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', animation: 'pulse-border 1.5s infinite' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>🚨 URGENT DISPATCH REQUEST</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 700 }}>HIGH PRIORITY</span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', color: 'var(--red-dark)', marginBottom: '0.5rem' }}>
                        {sosState.description || 'Cardiac Emergency Reported'}
                      </h3>

                      <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Patient Name:</span>
                          <strong>{sosState.patientName || 'Jane Citizen'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Blood Group:</span>
                          <span className="badge badge-red">{sosState.patientBlood || 'O+'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Contact Phone:</span>
                          <strong>{sosState.patientPhone || '+1 (555) 019-2834'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Distance:</span>
                          <strong style={{ color: 'var(--blue)' }}>0.8 km (approx 2 mins)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>GPS Target:</span>
                          <span>{sosState.lat?.toFixed(4)}, {sosState.lng?.toFixed(4)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-danger" style={{ flex: 2, padding: '0.85rem' }} onClick={acceptSOS}>
                          ⚡ Accept & Respond Immediately
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => api.updateSOS({ status: 'declined' })}>
                          Pass
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Mission Dashboard (When accepted) */}
                  {sosState && sosState.volunteerId === 'vol-1' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Active navigation map & status */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h3 className="card-title" style={{ margin: 0 }}>🧭 Live Navigation & Triage</h3>
                          <span className={`badge ${sosState.status === 'arrived' ? 'badge-emerald' : 'badge-blue'}`}>
                            {sosState.status === 'arrived' ? 'ON SCENE' : 'EN ROUTE'}
                          </span>
                        </div>

                        <div className="map-simulation" style={{ marginBottom: '0.75rem' }}>
                          <div className="map-grid-lines" />
                          <svg width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                            <circle cx="50" cy="270" r="10" fill="var(--blue)" />
                            <text x="65" y="275" fill="white" fontSize="12" fontWeight="bold">You (Volunteer)</text>
                            
                            <circle cx="280" cy="80" r="10" fill="var(--red)" />
                            <text x="210" y="70" fill="white" fontSize="12" fontWeight="bold">Patient SOS</text>
                            
                            <path d="M50 270 Q 150 180, 280 80" fill="none" stroke="var(--blue)" strokeWidth="5" className="map-route-line" />
                          </svg>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                          <span>Route Progress: <strong>{navProgress}%</strong></span>
                          <span>ETA: <strong>{navProgress >= 100 ? '0 mins (Arrived)' : '2 mins remaining'}</strong></span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                          <div style={{ width: `${navProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--blue), var(--emerald))', transition: 'width 0.4s ease' }} />
                        </div>

                        {/* Fast Actions on scene */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={triggerAmbulance}>
                            🚑 Request Ambulance
                          </button>
                          <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={startDoctorConsult}>
                            🥼 Consult ER Doctor
                          </button>
                        </div>
                      </div>

                      {/* CPR Metronome & First Aid Rhythm Assistant */}
                      <div className="card" style={{ background: isCprActive ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h3 className="card-title" style={{ margin: 0 }}>💓 CPR Rhythm Assistant (110 BPM)</h3>
                          <button 
                            className={`btn ${isCprActive ? 'btn-danger' : 'btn-outline'}`} 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => setIsCprActive(!isCprActive)}
                          >
                            {isCprActive ? '⏹ Stop Rhythm' : '▶ Start Metronome'}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          Optimal compression rate for adult resuscitation is 100-120 compressions per minute. Compress chest at least 2 inches (5cm).
                        </p>
                        
                        {isCprActive && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.04)', borderRadius: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: cprBeats % 2 === 0 ? 'var(--red)' : 'var(--blue)',
                              transform: cprBeats % 2 === 0 ? 'scale(1.25)' : 'scale(0.9)',
                              transition: 'transform 0.1s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: '0.8rem'
                            }}>
                              {cprBeats}
                            </div>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 800 }}>PUSH PUSH PUSH</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cycle: {Math.floor(cprBeats / 30) + 1} | Give 2 Breaths after 30 compressions</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Doctor Video/Audio Consultation Session */}
                      {sosState.consultationActive && (
                        <div className="card" style={{ border: '2px solid var(--blue)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>🥼 Live ER Doctor Telehealth Feed</h3>
                            <span className="badge badge-emerald">Connected (Dr. Sarah MD)</span>
                          </div>
                          
                          <div className="call-simulator">
                            <div className="video-feed">
                              <span className="video-avatar">🥼</span>
                            </div>
                            <div className="call-controls">
                              <button className="btn btn-outline" onClick={() => setCallMuted(!callMuted)}>
                                {callMuted ? '🎙️ Unmute' : '🎙️ Mute Mic'}
                              </button>
                              <button className="btn btn-danger" onClick={endDoctorConsult}>
                                🔴 End Call
                              </button>
                            </div>
                          </div>

                          <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.03)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                            <strong>Doctor Instructions:</strong> Maintain airway open, check pulse every 60 seconds, ensure AED pads are firmly stuck to dry chest.
                          </div>
                        </div>
                      )}

                      {/* Field Incident Completion Report */}
                      <div className="card">
                        <h3 className="card-title">📝 Field Incident & Vitals Report</h3>
                        <form onSubmit={handleDetailedReportSubmit}>
                          <div className="form-group">
                            <label className="form-label">Patient Condition on Arrival</label>
                            <select className="form-select" value={reportForm.condition} onChange={e => setReportForm({...reportForm, condition: e.target.value})}>
                              <option value="Unconscious / No Pulse">Unconscious / No Pulse (CPR required)</option>
                              <option value="Conscious but Distressed">Conscious but Distressed (Severe Pain)</option>
                              <option value="Severe Bleeding / Trauma">Severe Bleeding / Trauma</option>
                              <option value="Choking / Respiratory Arrest">Choking / Respiratory Arrest</option>
                              <option value="Stabilized / Awake">Stabilized / Awake</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">First-Aid Interventions Given</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="e.g. CPR 3 cycles, AED 1 shock, Heimlich maneuver" 
                              value={reportForm.interventions} 
                              onChange={e => setReportForm({...reportForm, interventions: e.target.value})} 
                              required 
                            />
                          </div>

                          <div className="grid-2">
                            <div className="form-group">
                              <label className="form-label">Recorded Pulse / HR</label>
                              <input type="text" className="form-input" placeholder="e.g. 78 bpm" value={reportForm.pulse} onChange={e => setReportForm({...reportForm, pulse: e.target.value})} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Blood Pressure (Est.)</label>
                              <input type="text" className="form-input" placeholder="e.g. 120/80" value={reportForm.bloodPressure} onChange={e => setReportForm({...reportForm, bloodPressure: e.target.value})} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Detailed Responder Observations</label>
                            <textarea 
                              className="form-textarea" 
                              rows="3" 
                              placeholder="Describe patient response, time ambulance took over, etc." 
                              value={reportForm.notes} 
                              onChange={e => setReportForm({...reportForm, notes: e.target.value})} 
                              required 
                            />
                          </div>

                          <button type="submit" className="btn btn-danger" style={{ width: '100%', padding: '0.85rem' }}>
                            ✓ Close Emergency & Submit Incident Log
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Idle Standby State */}
                  {(!sosState || sosState.status === 'closed' || sosState.status === 'resolved') && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>📡</span>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Listening for Emergency Broadcasts</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto 1.25rem' }}>
                        Your GPS is actively broadcasting location to dispatch centers. You will be alerted the moment someone near you triggers an SOS.
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.8rem', color: 'var(--emerald)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }}></span>
                        GPS Active: {volProfile.currentLocation?.latitude?.toFixed(4) || '37.7749'}, {volProfile.currentLocation?.longitude?.toFixed(4) || '-122.4194'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Volunteer Qualifications & Emergency Kit Checklist */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Responder Credentials */}
                  <div className="card">
                    <h3 className="card-title">🪪 First Responder Credentials</h3>
                    <form onSubmit={handleSaveVolunteerProfile}>
                      <div className="form-group">
                        <label className="form-label">Full Legal Name</label>
                        <input type="text" className="form-input" value={volProfile.name} onChange={e => setVolProfile({...volProfile, name: e.target.value})} required />
                      </div>

                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Contact Phone</label>
                          <input type="tel" className="form-input" value={volProfile.phone} onChange={e => setVolProfile({...volProfile, phone: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Experience (Years)</label>
                          <input type="number" className="form-input" min="0" max="40" value={volProfile.experience} onChange={e => setVolProfile({...volProfile, experience: Number(e.target.value)})} />
                        </div>
                      </div>

                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Primary Certification</label>
                          <input type="text" className="form-input" value={volProfile.certification} onChange={e => setVolProfile({...volProfile, certification: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">License / Cert ID</label>
                          <input type="text" className="form-input" value={volProfile.certificationNumber} onChange={e => setVolProfile({...volProfile, certificationNumber: e.target.value})} required />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Response Radius (km): <strong>{volProfile.serviceRadius} km</strong></label>
                        <input 
                          type="range" 
                          min="1" 
                          max="20" 
                          step="1" 
                          value={volProfile.serviceRadius} 
                          onChange={e => setVolProfile({...volProfile, serviceRadius: Number(e.target.value)})} 
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Certified Medical Skills</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                          {['CPR (Adult/Pediatric)', 'AED Defibrillation', 'Tourniquet / Bleeding Control', 'EpiPen / Anaphylaxis', 'Burn Care', 'Splinting & Fractures', 'Choking Relief'].map(skill => (
                            <span 
                              key={skill} 
                              onClick={() => toggleSkill(skill)}
                              style={{ 
                                cursor: 'pointer',
                                padding: '0.35rem 0.65rem', 
                                borderRadius: '8px', 
                                fontSize: '0.75rem', 
                                border: '1px solid var(--border)',
                                background: (volProfile.skills || []).includes(skill) ? 'var(--blue)' : 'rgba(0,0,0,0.03)',
                                color: (volProfile.skills || []).includes(skill) ? '#fff' : 'var(--text-primary)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {(volProfile.skills || []).includes(skill) ? '✓ ' : '+ '}{skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                        💾 Save Responder Profile
                      </button>
                    </form>
                  </div>

                  {/* First Aid Kit Equipment Checklist */}
                  <div className="card">
                    <h3 className="card-title">🎒 Responder Kit Inspection Checklist</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Verify your kit items before going on duty to ensure emergency readiness.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {kitItems.map((item, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', padding: '0.4rem 0.5rem', borderRadius: '8px', background: item.checked ? 'rgba(16, 185, 129, 0.06)' : 'rgba(0,0,0,0.02)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={item.checked} onChange={() => toggleKitItem(idx)} style={{ accentColor: 'var(--emerald)', width: '16px', height: '16px' }} />
                          <span style={{ textDecoration: item.checked ? 'none' : 'none', fontWeight: item.checked ? 600 : 400 }}>{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Volunteer Past Case Incident History */}
              {activeTab === 'history' && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>📜 Emergency Incident History</h3>
                    <span className="badge badge-blue">{incidentLogs.length} Cases Logged</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {incidentLogs.map(log => (
                      <div key={log.id} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{log.firstAidProvided || 'Emergency Response'}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.date}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          {log.description || log.notes}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                          <span className="badge badge-emerald">Outcome: {log.patientCondition || log.condition || 'Resolved'}</span>
                          {log.vitals && <span className="badge badge-blue">{log.vitals}</span>}
                          {log.pulse && <span className="badge badge-blue">Pulse: {log.pulse}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Training & Certified Protocol Guides */}
              {activeTab === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="card">
                    <h3 className="card-title">📖 Certified Protocol Quick Reference</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '10px', borderLeft: '4px solid var(--red)' }}>
                        <strong style={{ color: 'var(--red-dark)' }}>⚡ Adult CPR & Defibrillation</strong>
                        <p style={{ marginTop: '0.25rem' }}>Place heel of hand in center of chest. Push hard and fast (100-120/min). If AED is available, turn on and apply pads immediately without interrupting compressions until voice prompts.</p>
                      </div>

                      <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', borderLeft: '4px solid var(--blue)' }}>
                        <strong style={{ color: 'var(--blue-dark)' }}>🩸 Severe Bleeding / Tourniquet</strong>
                        <p style={{ marginTop: '0.25rem' }}>Apply direct continuous pressure with sterile gauze. If bleeding continues from limb, apply tourniquet 2-3 inches above wound (never on joints). Tighten until bleeding stops and record time.</p>
                      </div>

                      <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', borderLeft: '4px solid var(--emerald)' }}>
                        <strong style={{ color: 'var(--emerald)' }}>🫁 Choking Relief (Conscious Adult)</strong>
                        <p style={{ marginTop: '0.25rem' }}>Stand behind victim. Give 5 firm back blows between shoulder blades. If still blocked, wrap arms around waist, make fist above navel, and give 5 quick inward/upward abdominal thrusts.</p>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="card-title">📚 Continuing Education Articles</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {articles.map(art => (
                        <div key={art.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem' }}>{art.title}</strong>
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{art.category || 'Guide'}</span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{art.content}</p>
                        </div>
                      ))}
                    </div>
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
            {user.role === 'volunteer' ? 'Dispatch' : 'SOS'}
          </button>
          <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-tab-icon">📋</span>
            {user.role === 'volunteer' ? 'Credentials' : 'Medical Card'}
          </button>
          {user.role === 'volunteer' && (
            <button className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <span className="nav-tab-icon">📜</span>
              Incident Logs
            </button>
          )}
          {user.role === 'citizen' && (
            <button className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
              <span className="nav-tab-icon">👥</span>
              Directory
            </button>
          )}
          <button className={`nav-tab ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
            <span className="nav-tab-icon">📚</span>
            Training
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
