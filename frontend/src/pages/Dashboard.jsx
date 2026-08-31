import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard({ user = { name: 'David Miller', email: 'david@alertlife.org', role: 'volunteer' }, onLogout }) {
  const currentRole = (user && user.role) ? user.role.toLowerCase() : 'volunteer';
  const isMobile = currentRole === 'citizen' || currentRole === 'volunteer';

  // State Management
  const [activeTab, setActiveTab] = useState('sos');
  const [sosDescription, setSosDescription] = useState('');
  const [sosState, setSosState] = useState(() => {
    try {
      return api.getActiveSOS();
    } catch {
      return null;
    }
  });
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

  // Awareness Publishing for Volunteers & Admins
  const [awarenessMediaFilter, setAwarenessMediaFilter] = useState('all');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newPublish, setNewPublish] = useState({
    title: '',
    category: 'Camp Awareness',
    contentType: 'image',
    mediaUrl: '',
    duration: '',
    location: '',
    date: '',
    content: ''
  });

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

  // Volunteer Work & Salary / Stipend Ledger for Admin
  const [rescueLedger, setRescueLedger] = useState(api.getRescueLedger ? api.getRescueLedger() : []);

  const handleCreditVolunteer = (rescueId, volName, amount) => {
    if (window.confirm(`Confirm salary/stipend transfer of $${amount} to ${volName}?`)) {
      const updated = api.creditVolunteerPayout(rescueId);
      if (updated) setRescueLedger(updated);
      alert(`✓ Payout of $${amount} successfully credited to ${volName}'s verified bank account!`);
    }
  };

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
      if (api.getRescueLedger) {
        setRescueLedger(api.getRescueLedger() || []);
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

  // Citizen Emergency Action Trigger (Urgent SOS, Minor Injuries, Small Road Accidents, Ambulance Dispatch)
  const [selectedIncidentType, setSelectedIncidentType] = useState('critical'); // critical, minor_injury, road_accident, first_aid
  const [requestAmbulance, setRequestAmbulance] = useState(false);

  const handleTriggerSOS = (customType, customDesc, needAmbulance = false) => {
    const finalType = customType || selectedIncidentType || 'critical';
    const finalDesc = customDesc || sosDescription || (finalType === 'minor_injury' ? 'Minor Injury First Aid Assistance' : finalType === 'road_accident' ? 'Minor Road Accident Support' : 'Urgent Medical Emergency');
    const finalSeverity = finalType === 'minor_injury' || finalType === 'road_accident' ? 'moderate' : 'high';
    const isAmbulance = needAmbulance || requestAmbulance;

    const executeSOS = (lat, lng) => {
      const newSOS = api.triggerSOS({
        lat: lat || 37.7749,
        lng: lng || -122.4194,
        description: finalDesc,
        severity: finalSeverity,
        category: finalType,
        ambulanceRequested: isAmbulance
      });
      setSosState(newSOS);
      simulateDispatches();
    };

    if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeSOS(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          executeSOS(37.7749, -122.4194);
        },
        { timeout: 3000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    } else {
      executeSOS(37.7749, -122.4194);
    }
  };

  const simulateDispatches = () => {
    setTimeout(() => {
      // Mark as matched so incoming emergency card appears on Volunteer's screen
      const current = api.getActiveSOS();
      if (current && (current.status === 'locating' || !current.status)) {
        api.updateSOS({ status: 'matched' });
      }
    }, 1000);
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

  // Awareness Publishing Handler (Videos, Images, PDF Documents, Health Camps)
  const [editingId, setEditingId] = useState(null);

  const openEditModal = (item, isCamp = false) => {
    setEditingId(item.id);
    if (isCamp) {
      setNewPublish({
        title: item.title || '',
        category: 'Camp Awareness',
        contentType: 'camp',
        mediaUrl: '',
        duration: '',
        location: item.location || '',
        date: item.date ? new Date(item.date).toISOString().slice(0, 16) : '',
        content: item.title || ''
      });
    } else {
      setNewPublish({
        title: item.title || '',
        category: item.category || 'First Aid Guides',
        contentType: item.contentType || 'article',
        mediaUrl: item.videoUrl || item.imageUrl || item.docUrl || '',
        duration: item.readTime || '',
        location: '',
        date: '',
        content: item.content || ''
      });
    }
    setShowPublishModal(true);
  };

  const handleDeleteArticle = (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      api.deleteArticle(id).then(updated => {
        if (updated) setArticles(updated);
      });
    }
  };

  const handleDeleteWebinar = (id, title) => {
    if (window.confirm(`Are you sure you want to delete camp/webinar "${title}"?`)) {
      api.deleteWebinar(id).then(updated => {
        if (updated) setWebinars(updated);
      });
    }
  };

  const handlePublishAwareness = (e) => {
    e.preventDefault();
    if (!newPublish.title || (!newPublish.content && newPublish.contentType !== 'camp')) {
      alert('Please provide a title and description.');
      return;
    }

    if (newPublish.contentType === 'camp') {
      const campObj = {
        title: newPublish.title,
        speaker: `${volProfile.name || 'Volunteer'} (Organizer)`,
        location: newPublish.location || 'Community Health Center',
        date: newPublish.date || new Date().toISOString(),
        type: 'Health Camp'
      };

      if (editingId) {
        api.updateWebinar(editingId, campObj).then(updatedEvents => {
          if (updatedEvents) setWebinars(updatedEvents);
        });
      } else {
        api.addWebinar(campObj).then(updatedEvents => {
          if (updatedEvents) setWebinars(updatedEvents);
        });
      }
    } else {
      const contentObj = {
        title: newPublish.title,
        category: newPublish.category,
        contentType: newPublish.contentType,
        readTime: newPublish.contentType === 'video' ? (newPublish.duration || '3 min video') : newPublish.contentType === 'document' ? 'PDF Document' : 'Health Guide',
        videoUrl: newPublish.contentType === 'video' ? (newPublish.mediaUrl || 'https://www.youtube.com/watch?v=M4ACYp75mjU') : null,
        thumbnail: newPublish.contentType === 'video' ? 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80' : null,
        imageUrl: newPublish.contentType === 'image' ? (newPublish.mediaUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80') : null,
        docUrl: newPublish.contentType === 'document' ? (newPublish.mediaUrl || '#') : null,
        author: `${volProfile.name || 'Volunteer'} (Verified Responder)`,
        date: 'Updated recently',
        content: newPublish.content
      };

      if (editingId) {
        api.updateArticle(editingId, contentObj).then(updatedArticles => {
          if (updatedArticles) setArticles(updatedArticles);
        });
      } else {
        api.addArticle(contentObj).then(updatedArticles => {
          if (updatedArticles) setArticles(updatedArticles);
        });
      }
    }

    alert(editingId ? `✓ Updated "${newPublish.title}" successfully!` : `✓ Successfully published "${newPublish.title}" to Citizen Awareness Feeds!`);
    setEditingId(null);
    setNewPublish({
      title: '',
      category: 'Camp Awareness',
      contentType: 'image',
      mediaUrl: '',
      duration: '',
      location: '',
      date: '',
      content: ''
    });
    setShowPublishModal(false);
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

  const handleDetailedReportSubmit = (e) => {
    e.preventDefault();
    const activeEmergencyId = sosState?.id || 'sos-' + Date.now();
    api.submitIncidentReport(activeEmergencyId, {
      patientCondition: reportForm.condition,
      interventions: reportForm.interventions,
      pulse: reportForm.pulse,
      bloodPressure: reportForm.bloodPressure,
      notes: reportForm.notes,
      description: `${reportForm.interventions} | Condition: ${reportForm.condition}`,
      vitals: `BP ${reportForm.bloodPressure} | HR ${reportForm.pulse}`
    });
    setSosState(null);
    setNavProgress(0);
    alert('✓ Field Incident & Vitals Logged successfully! Rescue work recorded for Admin verification.');
  };

  const submitVolunteerReport = (e) => {
    e.preventDefault();
    handleDetailedReportSubmit(e);
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
              value={currentRole}
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
              {currentRole === 'citizen' && (
                <button className="btn btn-outline btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => api.closeSOS()}>Cancel</button>
              )}
            </div>
          )}

          {/* CITIZEN VIEWS */}
          {currentRole === 'citizen' && (
            <>
              {activeTab === 'sos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Urgent / Minor Triage Selector */}
                  <div className="card" style={{ padding: '0.85rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.4rem' }}>Select Incident Severity & Assistance Needed</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                      {[
                        { id: 'critical', label: '🚨 Critical SOS', desc: 'Cardiac / Unconscious', color: 'var(--red)' },
                        { id: 'minor_injury', label: '🩹 Minor Injury', desc: 'Cuts, Sprains, Burns', color: 'var(--amber)' },
                        { id: 'road_accident', label: '🚗 Road Accident', desc: 'Minor Crash Support', color: 'var(--blue)' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          disabled={!!sosState}
                          onClick={() => setSelectedIncidentType(type.id)}
                          style={{
                            padding: '0.6rem 0.4rem',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: selectedIncidentType === type.id ? type.color : 'var(--border)',
                            background: selectedIncidentType === type.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0,0,0,0.02)',
                            color: selectedIncidentType === type.id ? type.color : 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div>{type.label}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Action SOS Card */}
                  <div className="card">
                    <h3 className="card-title">
                      {selectedIncidentType === 'critical' ? '🚨 Urgent Life-Threatening Emergency' : selectedIncidentType === 'minor_injury' ? '🩹 Minor Injury & First Aid Volunteer Dispatch' : '🚗 Roadside Accident First Aid Dispatch'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                      {selectedIncidentType === 'critical' 
                        ? `Tap SOS to immediately alert all certified volunteers and ER ambulance within ${radius} km.`
                        : `Request immediate on-scene first aid support from nearby certified volunteers for dressing, splints, burns, or sprains.`}
                    </p>

                    <div className="form-group">
                      <label className="form-label">Condition & Injury Details</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={selectedIncidentType === 'minor_injury' ? "e.g. Deep cut on forearm, ankle sprain, minor thermal burn" : selectedIncidentType === 'road_accident' ? "e.g. Minor two-wheeler skid, scrapes and bleeding" : "e.g. Severe chest pain, shortness of breath, collapsed"} 
                        value={sosDescription} 
                        onChange={e => setSosDescription(e.target.value)} 
                        disabled={!!sosState} 
                      />
                    </div>

                    {/* Ambulance Checkbox Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.06)', padding: '0.65rem 0.85rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div>
                        <strong style={{ fontSize: '0.82rem' }}>🚑 Request Ambulance Backup</strong>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Dispatches paramedic hospital ambulance alongside volunteer</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={requestAmbulance} 
                        onChange={e => setRequestAmbulance(e.target.checked)} 
                        disabled={!!sosState}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>

                    <div className="sos-button-container">
                      <button 
                        className="sos-pulse-button" 
                        onClick={() => handleTriggerSOS(selectedIncidentType, sosDescription, requestAmbulance)} 
                        disabled={!!sosState}
                        style={{
                          background: selectedIncidentType === 'minor_injury' 
                            ? 'radial-gradient(circle, #f59e0b 0%, #d97706 100%)' 
                            : selectedIncidentType === 'road_accident' 
                            ? 'radial-gradient(circle, #6366f1 0%, #4f46e5 100%)' 
                            : 'radial-gradient(circle, var(--red) 0%, var(--red-dark) 100%)'
                        }}
                      >
                        {selectedIncidentType === 'critical' ? 'SOS' : 'HELP'}
                        <span>{sosState ? 'DISPATCH ACTIVE' : 'TAP FOR VOLUNTEER'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick 1-Tap Minor Injury Action Presets */}
                  {!sosState && (
                    <div className="card">
                      <h3 className="card-title">⚡ Quick 1-Tap Emergency Actions</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                        One-click instant dispatch for common roadside and home incidents:
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        {[
                          { title: '🩸 Bleeding & Cuts', desc: 'Direct pressure & bandage kit', type: 'minor_injury', ambulance: false },
                          { title: '🦴 Fracture / Sprain', desc: 'Splinting & immobilization', type: 'minor_injury', ambulance: true },
                          { title: '🔥 Burns & Scalds', desc: 'Cool dressing & burn relief', type: 'minor_injury', ambulance: false },
                          { title: '🛵 Two-Wheeler Skid', desc: 'Roadside scrape & triage', type: 'road_accident', ambulance: true },
                          { title: '🐝 Animal/Insect Bite', desc: 'Allergy & sting protocol', type: 'minor_injury', ambulance: false },
                          { title: '🫁 Asthma / Dizziness', desc: 'Oxygen & seated recovery', type: 'critical', ambulance: true }
                        ].map((action, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handleTriggerSOS(action.type, action.title, action.ambulance)}
                            style={{
                              padding: '0.6rem 0.5rem',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.2rem',
                              background: '#fff',
                              border: '1px solid var(--border)',
                              borderRadius: '10px'
                            }}
                          >
                            <strong style={{ fontSize: '0.78rem' }}>{action.title}</strong>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{action.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 24/7 National Emergency Helplines & Ambulance Quick Dial */}
                  <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 className="card-title" style={{ margin: 0 }}>📞 Emergency Hotline Quick Dial</h3>
                      <span className="badge badge-emerald">24/7 Toll-Free</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                      <a href="tel:108" style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.2rem', display: 'block' }}>🚑</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--red)' }}>108 / 911</strong>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Ambulance</span>
                        </div>
                      </a>
                      <a href="tel:100" style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.2rem', display: 'block' }}>🚓</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--blue)' }}>100 / 112</strong>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Police/Rescue</span>
                        </div>
                      </a>
                      <a href="tel:102" style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '1.2rem', display: 'block' }}>🏥</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--emerald)' }}>102</strong>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>First Aid Help</span>
                        </div>
                      </a>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Hero Banner */}
                  <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2rem' }}>📢</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Community Health & Camp Center</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Verified first-aid tutorials, YouTube training videos, downloadable emergency medical manuals, and free neighborhood health checkup camps.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Citizen Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {['all', 'video', 'image', 'document', 'camps'].map(tabKey => (
                      <button
                        key={tabKey}
                        onClick={() => setAwarenessMediaFilter(tabKey)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '99px',
                          border: '1px solid var(--border)',
                          background: awarenessMediaFilter === tabKey ? 'var(--blue)' : 'rgba(0,0,0,0.03)',
                          color: awarenessMediaFilter === tabKey ? '#fff' : 'var(--text-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tabKey === 'all' && '🌐 All Feeds'}
                        {tabKey === 'video' && '🎬 Video Tutorials'}
                        {tabKey === 'image' && '🖼️ Posters & Infographics'}
                        {tabKey === 'document' && '📄 PDF Manuals'}
                        {tabKey === 'camps' && '🏥 Health Camps'}
                      </button>
                    ))}
                  </div>

                  {/* Upcoming Free Health Camps & Webinars */}
                  {(awarenessMediaFilter === 'all' || awarenessMediaFilter === 'camps') && webinars.length > 0 && (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>🏥 Free Health Camps & Medical Checkups</h3>
                        <span className="badge badge-emerald">{webinars.length} Available</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {webinars.map(w => (
                          <div key={w.id} style={{ background: 'rgba(16, 185, 129, 0.04)', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <span className="badge badge-emerald" style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>{w.type || 'Health Camp'}</span>
                                <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0' }}>{w.title}</h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  👤 Organized by: <strong>{w.speaker}</strong>
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  📍 {w.location || 'Community Center Ground'} | 📅 {new Date(w.date).toLocaleDateString()} at {new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleRegisterWebinar(w.id)}>
                                Register Free ({w.attendees || 0})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multimedia Awareness Posts (Videos, Posters, Docs) */}
                  {(awarenessMediaFilter !== 'camps') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {articles
                        .filter(art => {
                          if (awarenessMediaFilter === 'all') return true;
                          return (art.contentType || 'article') === awarenessMediaFilter;
                        })
                        .map(art => {
                          // Extract YouTube Embed URL if available
                          let ytEmbedUrl = null;
                          if (art.videoUrl) {
                            const ytMatch = art.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                            if (ytMatch && ytMatch[1]) {
                              ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
                            }
                          }

                          return (
                            <div key={art.id} className="card" style={{ padding: '1.25rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                                  {art.contentType === 'video' ? '🎬 Video Tutorial' : art.contentType === 'image' ? '🖼️ Camp Poster' : art.contentType === 'document' ? '📄 Health Manual' : '📖 Guide'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{art.readTime}</span>
                              </div>

                              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{art.title}</h4>

                              {/* Interactive YouTube Video Player Embed */}
                              {art.contentType === 'video' && (
                                <div style={{ marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                                  {ytEmbedUrl ? (
                                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                                      <iframe
                                        src={ytEmbedUrl}
                                        title={art.title}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', maxHeight: '200px' }}>
                                      <img src={art.thumbnail || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80"} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <a 
                                        href={art.videoUrl || "https://www.youtube.com/watch?v=M4ACYp75mjU"} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{
                                          position: 'absolute',
                                          inset: 0,
                                          background: 'rgba(0,0,0,0.4)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#fff',
                                          fontSize: '2rem',
                                          textDecoration: 'none'
                                        }}
                                      >
                                        ▶️ Watch Video
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Poster / Infographic Image */}
                              {art.contentType === 'image' && art.imageUrl && (
                                <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '240px', marginBottom: '0.75rem' }}>
                                  <img src={art.imageUrl} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}

                              {/* Document Download Link */}
                              {art.contentType === 'document' && (
                                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>📄 Official Emergency Manual (PDF)</span>
                                  <button className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }} onClick={() => alert('Downloading official medical guide (PDF)...')}>
                                    ⬇ Download PDF
                                  </button>
                                </div>
                              )}

                              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {art.content}
                              </p>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                <span>Published by: <strong>{art.author || 'Certified Volunteer'}</strong></span>
                                <span>{art.date || 'Aug 2026'}</span>
                              </div>
                            </div>
                          );
                        })}

                      {/* Empty State when no items for this tab */}
                      {articles.filter(item => (item.contentType || 'article') === awarenessMediaFilter).length === 0 && awarenessMediaFilter !== 'all' && (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
                            {awarenessMediaFilter === 'video' ? '🎬' : awarenessMediaFilter === 'image' ? '🖼️' : '📄'}
                          </span>
                          <h4>No {awarenessMediaFilter === 'video' ? 'videos' : awarenessMediaFilter === 'image' ? 'posters' : 'documents'} published yet</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Check back soon for upcoming volunteer tutorials and guides!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* VOLUNTEER VIEWS */}
          {currentRole === 'volunteer' && (
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

                  {/* Incoming Emergency Dispatch Card (Pending Volunteer Acceptance) */}
                  {sosState && sosState.status !== 'completed' && sosState.status !== 'closed' && !sosState.volunteerId && (
                    <div className="card" style={{ border: '2px solid var(--red)', background: 'rgba(244, 63, 94, 0.05)', animation: 'pulse-border 1.5s infinite' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>🚨 INCOMING CITIZEN EMERGENCY DISPATCH</span>
                        <span className={`badge ${sosState.severity === 'high' ? 'badge-red' : 'badge-amber'}`}>
                          {sosState.severity === 'high' ? 'HIGH PRIORITY' : 'MODERATE TRIAGE'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', color: 'var(--red-dark)', marginBottom: '0.5rem' }}>
                        {sosState.description || 'Emergency Assistance Requested'}
                      </h3>

                      <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>👤 Citizen Name:</span>
                          <strong>{sosState.patientName || 'Jane Citizen'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📞 Citizen Phone:</span>
                          <a href={`tel:${sosState.patientPhone || '+1 (555) 019-2834'}`} style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                            {sosState.patientPhone || '+1 (555) 019-2834'}
                          </a>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>🩸 Blood Group / Allergies:</span>
                          <span><strong>{sosState.patientBlood || 'O+'}</strong> (Allergies: {sosState.allergies || 'None'})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📋 Medical History:</span>
                          <strong>{sosState.medicalHistory || 'None'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📍 Exact GPS Target:</span>
                          <strong>{sosState.lat?.toFixed(4)}, {sosState.lng?.toFixed(4)}</strong>
                        </div>
                        {sosState.ambulanceStatus && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🚑 Ambulance Backup:</span>
                            <span className="badge badge-emerald">Dispatched ({sosState.ambulanceEta || '6 mins'})</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="btn btn-danger" 
                          style={{ flex: 2, padding: '0.85rem', fontSize: '0.85rem', fontWeight: 800 }} 
                          onClick={acceptSOS}
                        >
                          ⚡ Accept & Respond Immediately
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ flex: 1, padding: '0.85rem' }} 
                          onClick={() => api.updateSOS({ status: 'declined' })}
                        >
                          Pass
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standby Radar when no emergency is active */}
                  {!sosState && (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem', animation: 'pulse-avatar 2s infinite' }}>📡</span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Emergency Dispatch Radar Active</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        Scanning for citizen SOS alerts, roadside accidents, and minor injuries within your <strong>{volProfile.serviceRadius || 5} km</strong> coverage zone.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-emerald">
                          🟢 Ready for Instant Dispatch
                        </span>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', background: 'linear-gradient(135deg, var(--red), var(--red-dark))' }}
                          onClick={() => {
                            const newSOS = api.triggerSOS({
                              lat: 37.7749,
                              lng: -122.4194,
                              description: '🩸 Roadside Skid & Leg Injury (Citizen SOS)',
                              severity: 'high',
                              category: 'road_accident',
                              ambulanceRequested: true
                            });
                            setSosState(newSOS);
                          }}
                        >
                          ⚡ Simulate Incoming Citizen SOS
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Mission Dashboard (When accepted by volunteer) */}
                  {sosState && sosState.volunteerId && (
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

              {/* TAB 4: Awareness & Health Camp Publisher */}
              {activeTab === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Action Banner to Publish */}
                  <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>📢 Citizen Awareness Hub</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Publish educational videos, first-aid posters, medical guide documents, or schedule free health checkup camps for citizens.
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                        onClick={() => setShowPublishModal(!showPublishModal)}
                      >
                        {showPublishModal ? '✕ Close Publisher' : '+ Publish Awareness Post'}
                      </button>
                    </div>
                  </div>

                  {/* Publishing Studio Form Modal */}
                  {showPublishModal && (
                    <div className="card" style={{ border: '2px solid var(--blue)', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>
                          {editingId ? '✏️ Edit Awareness Content' : '📤 Publish New Citizen Awareness Content'}
                        </h3>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          onClick={() => { setShowPublishModal(false); setEditingId(null); }}
                        >
                          ✕ Close
                        </button>
                      </div>
                      <form onSubmit={handlePublishAwareness}>
                        <div className="form-group">
                          <label className="form-label">Content Medium / Type</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                            {[
                              { id: 'video', label: '🎬 Video', desc: 'YouTube/Video Demo' },
                              { id: 'image', label: '🖼️ Poster', desc: 'Infographic / Flyer' },
                              { id: 'document', label: '📄 PDF Guide', desc: 'Medical Manual' },
                              { id: 'camp', label: '🏥 Camp', desc: 'Health Camp Event' }
                            ].map(type => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setNewPublish({ ...newPublish, contentType: type.id })}
                                style={{
                                  padding: '0.6rem 0.4rem',
                                  borderRadius: '10px',
                                  border: '1px solid',
                                  borderColor: newPublish.contentType === type.id ? 'var(--blue)' : 'var(--border)',
                                  background: newPublish.contentType === type.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.02)',
                                  color: newPublish.contentType === type.id ? 'var(--blue)' : 'var(--text-primary)',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  textAlign: 'center'
                                }}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Headline / Title</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder={newPublish.contentType === 'camp' ? "e.g. Free Cardiac & BP Screening Camp" : newPublish.contentType === 'video' ? "e.g. Step-by-Step Adult CPR Video Tutorial" : "e.g. Choking Relief Poster for Toddlers"}
                            value={newPublish.title} 
                            onChange={e => setNewPublish({...newPublish, title: e.target.value})} 
                            required 
                          />
                        </div>

                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-select" value={newPublish.category} onChange={e => setNewPublish({...newPublish, category: e.target.value})}>
                              <option value="Camp Awareness">🏥 Health Camp Awareness</option>
                              <option value="CPR Training">💓 CPR & Resuscitation</option>
                              <option value="First Aid Guides">🩹 First Aid Guides</option>
                              <option value="Health Tips">🥗 Daily Health & Wellness</option>
                              <option value="Emergency Protocols">⚡ Emergency Protocols</option>
                            </select>
                          </div>

                          {newPublish.contentType === 'video' && (
                            <div className="form-group">
                              <label className="form-label">Video Demo URL (YouTube / MP4)</label>
                              <input type="url" className="form-input" placeholder="https://youtube.com/watch?v=..." value={newPublish.mediaUrl} onChange={e => setNewPublish({...newPublish, mediaUrl: e.target.value})} />
                            </div>
                          )}

                          {newPublish.contentType === 'image' && (
                            <div className="form-group">
                              <label className="form-label">Infographic / Poster Image URL</label>
                              <input type="url" className="form-input" placeholder="https://images.unsplash.com/..." value={newPublish.mediaUrl} onChange={e => setNewPublish({...newPublish, mediaUrl: e.target.value})} />
                            </div>
                          )}

                          {newPublish.contentType === 'document' && (
                            <div className="form-group">
                              <label className="form-label">Document Download URL</label>
                              <input type="text" className="form-input" placeholder="PDF link or drive URL" value={newPublish.mediaUrl} onChange={e => setNewPublish({...newPublish, mediaUrl: e.target.value})} />
                            </div>
                          )}

                          {newPublish.contentType === 'camp' && (
                            <div className="form-group">
                              <label className="form-label">Camp Location / Venue</label>
                              <input type="text" className="form-input" placeholder="e.g. Town Hall Community Ground" value={newPublish.location} onChange={e => setNewPublish({...newPublish, location: e.target.value})} required />
                            </div>
                          )}
                        </div>

                        {newPublish.contentType === 'camp' && (
                          <div className="form-group">
                            <label className="form-label">Camp Date & Start Time</label>
                            <input type="datetime-local" className="form-input" value={newPublish.date} onChange={e => setNewPublish({...newPublish, date: e.target.value})} required />
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">Detailed Content / Instructions</label>
                          <textarea 
                            className="form-textarea" 
                            rows="3" 
                            placeholder={newPublish.contentType === 'camp' ? "Explain timings, free services offered (ECG, blood sugar, vitals), and required documents..." : "Explain the health guide steps, key takeaways, and emergency contact steps..."} 
                            value={newPublish.content} 
                            onChange={e => setNewPublish({...newPublish, content: e.target.value})} 
                            required 
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.8rem' }}>
                            {editingId ? '✓ Save & Update Content' : '✓ Broadcast to Citizen Community'}
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            style={{ flex: 1 }} 
                            onClick={() => { setShowPublishModal(false); setEditingId(null); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {['all', 'video', 'image', 'document', 'camps'].map(tabKey => (
                      <button
                        key={tabKey}
                        onClick={() => setAwarenessMediaFilter(tabKey)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '99px',
                          border: '1px solid var(--border)',
                          background: awarenessMediaFilter === tabKey ? 'var(--blue)' : 'rgba(0,0,0,0.03)',
                          color: awarenessMediaFilter === tabKey ? '#fff' : 'var(--text-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tabKey === 'all' && '🌐 All Feeds'}
                        {tabKey === 'video' && '🎬 Videos'}
                        {tabKey === 'image' && '🖼️ Posters & Infographics'}
                        {tabKey === 'document' && '📄 PDF Documents'}
                        {tabKey === 'camps' && '🏥 Health Camps'}
                      </button>
                    ))}
                  </div>

                  {/* Scheduled Health Camps List */}
                  {(awarenessMediaFilter === 'all' || awarenessMediaFilter === 'camps') && webinars.length > 0 && (
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>🏥 Scheduled Health Camps & Awareness Webinars</h3>
                        <span className="badge badge-emerald">{webinars.length} Active Events</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {webinars.map(w => (
                          <div key={w.id} style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <span className="badge badge-emerald" style={{ fontSize: '0.65rem', marginBottom: '0.35rem' }}>{w.type || 'Health Camp'}</span>
                                <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0' }}>{w.title}</h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  👤 Organizer: <strong>{w.speaker}</strong>
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  📍 {w.location || 'Community Center'} | 📅 {new Date(w.date).toLocaleDateString()} at {new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                                  👥 {w.attendees || 0} Registered
                                </span>
                                <button
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderColor: 'var(--blue)', color: 'var(--blue)' }}
                                  onClick={() => openEditModal(w, true)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-outline"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', borderColor: 'var(--red)', color: 'var(--red)' }}
                                  onClick={() => handleDeleteWebinar(w.id, w.title)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multimedia Awareness Feed (Videos, Posters, Docs) */}
                  {(awarenessMediaFilter !== 'camps') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {articles
                        .filter(item => {
                          if (awarenessMediaFilter === 'all') return true;
                          return (item.contentType || 'article') === awarenessMediaFilter;
                        })
                        .map(item => {
                          // Extract YouTube Embed URL if available
                          let ytEmbedUrl = null;
                          if (item.videoUrl) {
                            const ytMatch = item.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                            if (ytMatch && ytMatch[1]) {
                              ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
                            }
                          }

                          return (
                            <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                                  {item.contentType === 'video' ? '🎬 Video Tutorial' : item.contentType === 'image' ? '🖼️ Infographic Poster' : item.contentType === 'document' ? '📄 Printable Guide' : '📖 Guide'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.readTime}</span>
                                  <button
                                    className="btn btn-outline"
                                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem', borderColor: 'var(--blue)', color: 'var(--blue)' }}
                                    onClick={() => openEditModal(item, false)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="btn btn-outline"
                                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem', borderColor: 'var(--red)', color: 'var(--red)' }}
                                    onClick={() => handleDeleteArticle(item.id, item.title)}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>

                              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{item.title}</h4>

                              {/* Interactive Inline YouTube Embed / Video Player */}
                              {item.contentType === 'video' && (
                                <div style={{ marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                                  {ytEmbedUrl ? (
                                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                                      <iframe
                                        src={ytEmbedUrl}
                                        title={item.title}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', maxHeight: '220px' }}>
                                      <img src={item.thumbnail || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80"} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <a 
                                        href={item.videoUrl || "https://www.youtube.com/watch?v=M4ACYp75mjU"} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{
                                          position: 'absolute',
                                          inset: 0,
                                          background: 'rgba(0,0,0,0.45)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          textDecoration: 'none',
                                          color: '#fff',
                                          fontSize: '2.5rem'
                                        }}
                                      >
                                        ▶️
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Poster / Infographic Image */}
                              {item.contentType === 'image' && item.imageUrl && (
                                <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '240px', marginBottom: '0.75rem' }}>
                                  <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}

                              {/* Document Download Link */}
                              {item.contentType === 'document' && (
                                <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '0.75rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                                  <span>📄 Official Health Manual (PDF)</span>
                                  <a href={item.docUrl || '#'} className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={(e) => { e.preventDefault(); alert('Downloading Medical Guidelines PDF...'); }}>
                                    ⬇ Download PDF
                                  </a>
                                </div>
                              )}

                              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {item.content}
                              </p>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                <span>Author: <strong>{item.author || 'Alert Life Team'}</strong></span>
                                <span>Published: {item.date || 'Aug 2026'}</span>
                              </div>
                            </div>
                          );
                        })}

                      {/* Empty State when no items for this tab */}
                      {articles.filter(item => (item.contentType || 'article') === awarenessMediaFilter).length === 0 && awarenessMediaFilter !== 'all' && (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
                            {awarenessMediaFilter === 'video' ? '🎬' : awarenessMediaFilter === 'image' ? '🖼️' : '📄'}
                          </span>
                          <h4>No {awarenessMediaFilter === 'video' ? 'videos' : awarenessMediaFilter === 'image' ? 'posters' : 'documents'} published yet</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Click <strong>+ Publish Awareness Post</strong> above to add one!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Certified Protocol Quick Reference - Only on 'all' feed */}
                  {awarenessMediaFilter === 'all' && (
                    <div className="card">
                      <h3 className="card-title">📖 Responder Protocol Quick Reference</h3>
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
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
          <button className={`nav-tab ${activeTab === 'sos' ? 'active' : ''}`} onClick={() => setActiveTab('sos')}>
            <span className="nav-tab-icon">🚨</span>
            {currentRole === 'volunteer' ? 'Dispatch' : 'SOS'}
          </button>
          <button className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-tab-icon">📋</span>
            {currentRole === 'volunteer' ? 'Credentials' : 'Medical Card'}
          </button>
          {currentRole === 'volunteer' && (
            <button className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <span className="nav-tab-icon">📜</span>
              Incident Logs
            </button>
          )}
          {currentRole === 'citizen' && (
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
          <button className={`menu-item ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}>
            💰 Volunteer Payouts & Rescues
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
          <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.35rem' }}>Switch Active Portal:</label>
          <select
            className="form-select"
            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, width: '100%', marginBottom: '0.75rem' }}
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
          <p>Logged in: <strong>{user.name}</strong> ({user.role})</p>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem', padding: '0.35rem' }} onClick={onLogout}>
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
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Rescue Missions</p>
                <h2>12,840</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verified Responders</p>
                <h2>4,839</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Payouts Credited</p>
                <h2 style={{ color: 'var(--emerald)' }}>$48,250</h2>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="card-title">🚨 Live SOS & Volunteer Dispatch Monitor</h3>
              {sosState ? (
                <div style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <p><strong>Patient Name:</strong> {sosState.patientName}</p>
                      <p><strong>Patient Phone:</strong> {sosState.patientPhone}</p>
                      <p><strong>Condition / Incident:</strong> {sosState.description}</p>
                      <p><strong>Live Location:</strong> {sosState.lat?.toFixed(4)}, {sosState.lng?.toFixed(4)}</p>
                      <p><strong>Severity:</strong> <span className="badge badge-red">{sosState.severity || 'High'}</span></p>
                    </div>
                    <div>
                      <p><strong>Assigned Responder:</strong> {sosState.volunteerName ? `${sosState.volunteerName} (Verified)` : 'Matching nearby volunteers...'}</p>
                      <p><strong>Volunteer Phone:</strong> {sosState.volunteerPhone || 'N/A'}</p>
                      <p><strong>Dispatch Status:</strong> <span className="badge badge-blue">{sosState.status}</span></p>
                      <p><strong>Ambulance Backup:</strong> {sosState.ambulanceStatus || 'None requested'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No active emergency cases currently in progress.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: Volunteer Rescue Work & Salary Payouts Management */}
        {activeTab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-3">
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Missions Handled</p>
                <h2>{rescueLedger.length}</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Salary Approvals</p>
                <h2 style={{ color: 'var(--amber)' }}>
                  {rescueLedger.filter(r => r.payoutStatus.includes('Pending')).length}
                </h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Payout Amount</p>
                <h2 style={{ color: 'var(--emerald)' }}>
                  ${rescueLedger.reduce((acc, curr) => acc + (curr.payoutAmount || 0), 0).toFixed(2)}
                </h2>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0 }}>💰 Volunteer Rescue Ledger & Salary Crediting</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Track all volunteer rescue missions with patient details, GPS location, first-aid reports, and credit compensation directly.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Rescue ID & Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Volunteer Responder</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Patient & Incident</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>GPS Location & Time</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Action Taken / Notes</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Stipend / Salary</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Payment Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Admin Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rescueLedger.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong>{row.id}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{row.date}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong>{row.volunteerName}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{row.volunteerPhone}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong>{row.patientName}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{row.incidentType}</div>
                          <span className={`badge ${row.severity === 'Critical' || row.severity === 'high' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.62rem' }}>
                            {row.severity || 'Moderate'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ fontSize: '0.75rem' }}>📍 {row.location}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>⏱️ {row.durationMins || 30} mins on-scene</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', maxWidth: '220px' }}>
                          <p style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.3 }}>{row.notes}</p>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--emerald)' }}>${(row.payoutAmount || 45).toFixed(2)}</strong>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Calculated rate</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span className={`badge ${row.payoutStatus.includes('Credited') ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                            {row.payoutStatus}
                          </span>
                          {row.creditedAt && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>on {row.creditedAt}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {row.payoutStatus.includes('Pending') ? (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', background: 'var(--emerald)' }}
                              onClick={() => handleCreditVolunteer(row.id, row.volunteerName, row.payoutAmount || 45)}
                            >
                              ✓ Credit Salary
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 700 }}>
                              ✓ Disbursed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
