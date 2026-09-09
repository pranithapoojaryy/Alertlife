import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { api } from '../services/api';

export default function Dashboard({ user = { name: '', email: '', role: 'citizen' }, onLogout }) {
  const currentRole = (user && user.role) ? user.role.toLowerCase() : 'citizen';
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
  const [profile, setProfile] = useState(() => {
    const local = api.getProfileSync ? api.getProfileSync() : null;
    return local || { 
      name: '', 
      email: '', 
      phone: '', 
      bloodGroup: 'O+', 
      allergies: '', 
      medicalHistory: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      organDonor: false,
      medications: '',
      emergencyContacts: []
    };
  });
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Parent' });
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [radius, setRadius] = useState(api.getRadius());

  // Volunteer Specific Extended States
  const [dutyStatus, setDutyStatus] = useState('available');
  const [volProfile, setVolProfile] = useState(() => {
    return {
      name: '',
      email: '',
      phone: '',
      certification: 'Certified First Responder',
      certificationNumber: '',
      skills: ['CPR (Adult/Pediatric)', 'AED Defibrillation', 'Tourniquet / Bleeding Control', 'Choking Relief'],
      availabilityStatus: 'available',
      serviceRadius: 5,
      isVerified: true,
      totalEmergenciesHandled: 0,
      rating: 5.0,
      experience: 1,
      currentLocation: { latitude: 12.9352, longitude: 77.6245 }
    };
  });
  const [isCprActive, setIsCprActive] = useState(false);
  const [cprBeats, setCprBeats] = useState(0);
  const [incidentLogs, setIncidentLogs] = useState(api.getIncidentHistory ? api.getIncidentHistory() : []);
  const [reportForm, setReportForm] = useState({
    condition: '',
    interventions: '',
    pulse: '',
    bloodPressure: '',
    notes: ''
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
    Swal.fire({
      title: 'Confirm Stipend Transfer?',
      text: `Are you sure you want to credit $${amount} to ${volName}'s account?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Credit Funds'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = api.creditVolunteerPayout(rescueId);
        if (updated) setRescueLedger(updated);
        Swal.fire({
          title: 'Payout Transferred!',
          text: `✓ Payout of $${amount} successfully credited to ${volName}'s verified bank account!`,
          icon: 'success',
          confirmButtonColor: '#6366f1'
        });
      }
    });
  };

  // Proactive Live GPS capture on Dashboard initialization
  useEffect(() => {
    if (api.syncLiveLocation) {
      api.syncLiveLocation(currentRole).then(coords => {
        if (coords && currentRole === 'volunteer') {
          setVolProfile(prev => ({
            ...prev,
            currentLocation: { latitude: coords.latitude, longitude: coords.longitude, lastUpdated: new Date().toISOString() }
          }));
        }
      });
    }
  }, [currentRole]);

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

    // Track continuous emergency alarm siren & vibration for volunteer
    let alarmInterval = null;

    const playSirenPulse = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        // European / US Two-Tone Ambulance Siren Pulse (700Hz to 950Hz)
        osc.frequency.setValueAtTime(750, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(950, audioCtx.currentTime + 0.25);
        osc.frequency.linearRampToValueAtTime(750, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.55);
      } catch {
        // audio context handling
      }
    };

    const startContinuousAlarm = () => {
      if (!window._alertlife_siren_interval) {
        playSirenPulse();
        if (navigator.vibrate) {
          navigator.vibrate([400, 200, 400, 200, 600]);
        }
        window._alertlife_siren_interval = setInterval(() => {
          playSirenPulse();
          if (navigator.vibrate) {
            navigator.vibrate([400, 200, 400, 200, 600]);
          }
        }, 1200);
      }
    };

    const stopContinuousAlarm = () => {
      if (window._alertlife_siren_interval) {
        clearInterval(window._alertlife_siren_interval);
        window._alertlife_siren_interval = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };

    const fetchData = async () => {
      let liveSos = null;
      if (api.syncActiveSOSFromBackend) {
        liveSos = await api.syncActiveSOSFromBackend();
      } else {
        liveSos = api.getActiveSOS();
      }
      
      // Continuous siren & vibration loop until volunteer accepts, passes, or emergency resolves
      if (liveSos && liveSos.id && !liveSos.volunteerId && liveSos.status !== 'closed' && liveSos.status !== 'resolved' && currentRole === 'volunteer' && volProfile.isVerified) {
        startContinuousAlarm();
      } else {
        stopContinuousAlarm();
      }

      setSosState(prev => {
        if (JSON.stringify(prev) === JSON.stringify(liveSos)) {
          return prev;
        }
        return liveSos;
      });

      // Keep volunteer profile verification status synced
      if (currentRole === 'volunteer' && api.getVolunteerProfile) {
        api.getVolunteerProfile().then(vp => {
          if (vp) {
            setVolProfile(prev => ({ ...prev, ...vp, isVerified: vp.isVerified === true }));
          }
        });
      }

      // Sync members list for Admin
      if (currentRole === 'admin' || currentRole === 'hospital') {
        api.getMembers().then(data => setMembers(data || []));
      }
    };

    const fetchStaticData = () => {
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
    fetchStaticData();

    // High frequency sync interval (polls live Render cloud backend)
    const interval = setInterval(fetchData, 2000);

    // Instant cross-tab and in-tab event listeners
    window.addEventListener('storage', fetchData);
    window.addEventListener('alertlife_storage_update', fetchData);

    return () => {
      clearInterval(interval);
      stopContinuousAlarm();
      window.removeEventListener('storage', fetchData);
      window.removeEventListener('alertlife_storage_update', fetchData);
    };
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

    // Instant default coordinates (Bengaluru tech hub / fallback)
    const defaultLat = 12.9352;
    const defaultLng = 77.6245;
    const defaultAddress = 'Koramangala, Bengaluru, Karnataka';

    // 1. Immediately trigger and activate SOS locally & on backend
    api.triggerSOS({
      lat: defaultLat,
      lng: defaultLng,
      address: defaultAddress,
      description: finalDesc,
      severity: finalSeverity,
      category: finalType,
      ambulanceRequested: isAmbulance,
      patientProfile: profile
    }).then(newSOS => {
      setSosState(newSOS);
      simulateDispatches();
    });

    // 2. Query high-accuracy GPS in background and update emergency if available
    if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let addr = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { signal: AbortSignal.timeout(2000) });
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.display_name) {
                addr = geoData.display_name.split(',').slice(0, 3).join(',').trim();
              }
            }
          } catch {
            // retain coordinate string
          }
          api.updateSOS({ lat, lng, address: addr });
        },
        () => {
          // Keep default location
        },
        { timeout: 3000, enableHighAccuracy: false, maximumAge: 30000 }
      );
    }
  };

  const simulateDispatches = () => {
    // Immediately ensure status is ready for volunteer detection
    const current = api.getActiveSOS();
    if (current && (current.status === 'locating' || !current.status)) {
      api.updateSOS({ status: 'matched' });
    }
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
    if (!volProfile.name?.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Volunteer name is required.',
        icon: 'warning',
        confirmButtonColor: '#6366f1'
      });
      return;
    }
    if (volProfile.phone) {
      const volPhoneDigits = volProfile.phone.replace(/\D/g, '');
      if (volPhoneDigits.length !== 10 || !/^[6789]\d{9}$/.test(volPhoneDigits)) {
        Swal.fire({
          title: 'Invalid Phone Number',
          text: 'Volunteer phone number must be EXACTLY 10 digits (starting with 6, 7, 8, or 9).',
          icon: 'warning',
          confirmButtonColor: '#6366f1'
        });
        return;
      }
    }
    api.updateVolunteerProfile(volProfile).then(updated => {
      if (updated) setVolProfile(updated);
      Swal.fire({
        title: 'Responder Profile Updated!',
        text: 'Your responder credentials and skills have been successfully synchronized.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        timer: 2000,
        showConfirmButton: false
      });
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
    Swal.fire({
      title: 'Delete Guide Article?',
      text: `Are you sure you want to permanently delete "${title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        api.deleteArticle(id).then(updated => {
          if (updated) setArticles(updated);
          Swal.fire({
            title: 'Deleted!',
            text: `Article "${title}" removed.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        });
      }
    });
  };

  const handleDeleteWebinar = (id, title) => {
    Swal.fire({
      title: 'Delete Camp / Webinar?',
      text: `Are you sure you want to cancel and delete "${title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    }).then((result) => {
      if (result.isConfirmed) {
        api.deleteWebinar(id).then(updated => {
          if (updated) setWebinars(updated);
          Swal.fire({
            title: 'Deleted!',
            text: `Event "${title}" removed.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        });
      }
    });
  };

  const handlePublishAwareness = (e) => {
    e.preventDefault();
    if (!newPublish.title?.trim()) {
      Swal.fire({
        title: 'Title Required',
        text: 'Please provide a headline/title for this awareness publication.',
        icon: 'warning',
        confirmButtonColor: '#6366f1'
      });
      return;
    }
    if (!newPublish.content?.trim() && newPublish.contentType !== 'camp') {
      Swal.fire({
        title: 'Content Required',
        text: 'Please provide descriptions or practical instructions for the guide.',
        icon: 'warning',
        confirmButtonColor: '#6366f1'
      });
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

    Swal.fire({
      title: editingId ? 'Publication Updated!' : 'Published to Network!',
      text: editingId ? `✓ Updated "${newPublish.title}" successfully.` : `✓ Successfully published "${newPublish.title}" to Citizen Awareness Feeds!`,
      icon: 'success',
      confirmButtonColor: '#10b981',
      timer: 2200,
      showConfirmButton: false
    });
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

  // Volunteer SOS Auto-pass Countdown (30 seconds)
  const [sosCountdown, setSosCountdown] = useState(30);

  useEffect(() => {
    let timer = null;
    if (currentRole === 'volunteer' && sosState && !sosState.volunteerId && sosState.status !== 'closed' && sosState.status !== 'resolved') {
      setSosCountdown(30);
      timer = setInterval(() => {
        setSosCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Automatically cascade/pass to next nearby volunteer if no response in 30 seconds
            handlePassSOS(true);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSosCountdown(30);
    }
    return () => clearInterval(timer);
  }, [sosState?.id, sosState?.volunteerId, currentRole]);

  const acceptSOS = () => {
    // Immediately silence siren
    if (window._alertlife_siren_interval) {
      clearInterval(window._alertlife_siren_interval);
      window._alertlife_siren_interval = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);

    const active = api.updateSOS({
      status: 'accepted',
      volunteerId: 'vol-active',
      volunteerName: volProfile.name || user.name || 'Volunteer Responder',
      volunteerPhone: volProfile.phone || user.phone || '',
      volunteerCert: volProfile.certification || 'Certified First Responder'
    });
    setSosState(active);
  };

  const handlePassSOS = async (autoPass = false) => {
    // Immediately silence siren
    if (window._alertlife_siren_interval) {
      clearInterval(window._alertlife_siren_interval);
      window._alertlife_siren_interval = null;
    }
    if (navigator.vibrate) navigator.vibrate(0);

    const emergencyId = sosState?.id;
    const volId = volProfile?._id || user?._id || 'vol-active';
    
    // Clear local screen immediately
    setSosState(null);
    setNavProgress(0);

    Swal.fire({
      title: autoPass ? '⏰ Time Expired: SOS Re-routed' : 'SOS Request Passed',
      text: autoPass ? 'No response in 30s. Emergency alert automatically routed to next closest volunteer in the grid...' : 'Cascading emergency alert to the next closest available volunteer in the grid...',
      icon: 'info',
      timer: 2500,
      showConfirmButton: false
    });

    if (emergencyId) {
      await api.passSOS(emergencyId, volId);
    }
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
    Swal.fire({
      title: 'Incident Logged!',
      text: 'Field Incident & Vitals Logged successfully! Rescue work recorded for Admin verification.',
      icon: 'success',
      confirmButtonColor: '#10b981'
    });
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
    Swal.fire({
      title: 'Ambulance Dispatched!',
      text: 'Emergency Unit has been notified and dispatched with an estimated arrival time of 6 mins.',
      icon: 'success',
      confirmButtonColor: '#ef4444'
    });
  };

  // Admin Events
  const handleAddWebinar = (e) => {
    e.preventDefault();
    if (!newWebinar.title?.trim()) {
      Swal.fire({ title: 'Validation Error', text: 'Please provide a webinar/camp topic.', icon: 'warning', confirmButtonColor: '#6366f1' });
      return;
    }
    if (!newWebinar.speaker?.trim()) {
      Swal.fire({ title: 'Validation Error', text: 'Please enter organizer or speaker name.', icon: 'warning', confirmButtonColor: '#6366f1' });
      return;
    }
    if (!newWebinar.date) {
      Swal.fire({ title: 'Validation Error', text: 'Please select a date and time.', icon: 'warning', confirmButtonColor: '#6366f1' });
      return;
    }
    api.addWebinar(newWebinar);
    setNewWebinar({ title: '', speaker: '', date: '' });
    Swal.fire({
      title: 'Event Scheduled!',
      text: 'Webinar / Health Camp published to citizen feed.',
      icon: 'success',
      confirmButtonColor: '#10b981',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleAddArticle = (e) => {
    e.preventDefault();
    if (!newArticle.title?.trim() || !newArticle.content?.trim()) {
      Swal.fire({ title: 'Validation Error', text: 'Please provide both title and content for the guide.', icon: 'warning', confirmButtonColor: '#6366f1' });
      return;
    }
    api.addArticle(newArticle);
    setNewArticle({ title: '', category: 'Guides', readTime: '5 min read', content: '' });
    Swal.fire({
      title: 'Guide Published!',
      text: 'First Aid Guide has been broadcast to community network.',
      icon: 'success',
      confirmButtonColor: '#10b981',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Citizen Handlers
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    
    // Validation
    if (!profile.name?.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Full Name is required.',
        icon: 'warning',
        confirmButtonColor: '#6366f1'
      });
      return;
    }
    const phoneDigits = (profile.phone || '').replace(/\D/g, '');
    if (phoneDigits.length !== 10 || !/^[6789]\d{9}$/.test(phoneDigits)) {
      Swal.fire({
        title: 'Invalid Mobile Number',
        text: 'Phone number must be EXACTLY 10 digits (starting with 6, 7, 8, or 9).',
        icon: 'warning',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    api.updateProfile(profile).then(() => {
      Swal.fire({
        title: 'Profile Saved!',
        text: 'Your Personal & Health Profile has been successfully updated and synced.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        timer: 2200,
        showConfirmButton: false
      });
    }).catch(err => {
      Swal.fire({
        title: 'Save Failed',
        text: 'Could not update profile. Please try again.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span 
              style={{ 
                padding: '0.25rem 0.6rem', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                borderRadius: '20px',
                background: currentRole === 'volunteer' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)', 
                color: currentRole === 'volunteer' ? 'var(--emerald)' : 'var(--blue)',
                border: `1px solid ${currentRole === 'volunteer' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
              }}
            >
              {currentRole === 'volunteer' ? '🛡️ Volunteer' : '👤 Citizen'}
            </span>
            <button className="btn btn-outline" style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }} onClick={onLogout}>
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
                              <strong>{sosState.volunteerName || 'First Responder'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Certification:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sosState.volunteerCert || 'Certified First Responder'}</span>
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

                        <button 
                          className="btn btn-outline" 
                          style={{ marginTop: '0.5rem', width: '100%', borderColor: 'var(--red)', color: 'var(--red)', padding: '0.45rem', fontSize: '0.8rem' }}
                          onClick={async () => {
                            await api.closeSOS();
                            setSosState(null);
                          }}
                        >
                          ✕ Cancel / Clear Active Emergency
                        </button>
                      </div>

                      {/* Live Location Radar & Navigation Map */}
                      {sosState.status === 'accepted' && (
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue)' }}>
                              📡 Live GPS Tracking (Volunteer ➔ You)
                            </span>
                            <span className="badge badge-emerald" style={{ animation: 'pulse-avatar 1.5s infinite' }}>
                              🟢 Live GPS Active
                            </span>
                          </div>

                          {/* OpenStreetMap Live Embed for Citizen */}
                          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', height: '220px', marginBottom: '0.75rem' }}>
                            <iframe
                              title="Citizen Live Tracking Map"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              marginHeight="0"
                              marginWidth="0"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(sosState.lng || 77.6245) - 0.008}%2C${(sosState.lat || 12.9352) - 0.008}%2C${(sosState.lng || 77.6245) + 0.008}%2C${(sosState.lat || 12.9352) + 0.008}&layer=mapnik&marker=${sosState.lat || 12.9352}%2C${sosState.lng || 77.6245}`}
                              style={{ filter: 'contrast(1.05) saturate(1.1)', border: 0 }}
                            />
                            <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(239, 68, 68, 0.95)', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                              📍 Your SOS Location
                            </div>
                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(59, 130, 246, 0.95)', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                              🏃 Responder En Route ({100 - navProgress}% dist)
                            </div>
                          </div>

                          {/* Distance & ETA Bar */}
                          <div style={{ background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid var(--border)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span><strong>Responder:</strong> {sosState.volunteerName || 'First Responder'}</span>
                            <span style={{ color: 'var(--emerald)', fontWeight: 800 }}>ETA: {Math.max(1, Math.round((100 - navProgress) / 20))} mins</span>
                          </div>

                          <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                            <div style={{ width: `${navProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--blue), var(--emerald))', transition: 'width 0.4s ease' }} />
                          </div>
                          <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                            Responder live location sync: <strong>{navProgress}% traversed</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Digital Emergency Medical ID Banner */}
                  <div className="citizen-id-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div className="citizen-avatar">
                          {profile.name ? profile.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#fff' }}>{profile.name || 'Jane Citizen'}</h2>
                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                              EMERGENCY ID
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.2rem' }}>
                            📞 {profile.phone || '+1 (555) 019-2834'} • ✉️ {profile.email || 'jane@alertlife.com'}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgba(239, 68, 68, 0.6)', padding: '0.35rem 0.75rem', borderRadius: '10px', display: 'inline-block' }}>
                          <span style={{ fontSize: '0.65rem', display: 'block', textTransform: 'uppercase', opacity: 0.9 }}>Blood Type</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fee2e2' }}>{profile.bloodGroup || 'O+'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', opacity: 0.75, display: 'block' }}>Gender</span>
                        <strong style={{ fontSize: '0.82rem' }}>{profile.gender || 'Female'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', opacity: 0.75, display: 'block' }}>Date of Birth</span>
                        <strong style={{ fontSize: '0.82rem' }}>{profile.dateOfBirth || '1994-06-15'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', opacity: 0.75, display: 'block' }}>Organ Donor</span>
                        <strong style={{ fontSize: '0.82rem', color: profile.organDonor ? '#34d399' : '#f87171' }}>
                          {profile.organDonor ? '✓ Yes (Registered)' : 'No'}
                        </strong>
                      </div>
                    </div>

                    {profile.address && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>📍 Home:</span> <span>{profile.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Medical Details Card */}
                  <div className="card">
                    <div className="profile-section-heading">
                      <h4>🩺 Critical Medical Details</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <a 
                          href="#edit-citizen-profile" 
                          className="btn btn-outline" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', textDecoration: 'none' }}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('edit-citizen-profile')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          ✏️ Edit Info
                        </a>
                        <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>Paramedic Broadcast</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)' }}>⚠️ KNOWN ALLERGIES</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>{profile.allergies || 'None reported'}</div>
                      </div>
                      <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue)' }}>📋 MEDICAL CONDITIONS</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>{profile.medicalHistory || 'None reported'}</div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--emerald)' }}>💊 CURRENT MEDICATIONS</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '0.25rem' }}>{profile.medications || 'None'}</div>
                    </div>
                  </div>

                  {/* Emergency Contacts Section */}
                  <div className="card">
                    <div className="profile-section-heading">
                      <h4>🚨 Emergency Contacts ({profile.emergencyContacts?.length || 0})</h4>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                        onClick={() => {
                          if (showAddContact) {
                            setShowAddContact(false);
                            setEditingContactId(null);
                            setNewContact({ name: '', phone: '', relation: 'Spouse' });
                          } else {
                            setEditingContactId(null);
                            setNewContact({ name: '', phone: '', relation: 'Spouse' });
                            setShowAddContact(true);
                          }
                        }}
                      >
                        {showAddContact ? 'Cancel' : '+ Add Contact'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      These trusted contacts will receive automatic SMS/Call alerts whenever you trigger an SOS.
                    </p>

                    {showAddContact && (
                      <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px dashed var(--blue)', padding: '0.85rem', borderRadius: '12px', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--blue)' }}>
                          {editingContactId ? '✏️ Edit Emergency Contact' : '➕ Add Emergency Contact'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Full Name" 
                            style={{ padding: '0.5rem', fontSize: '0.75rem' }} 
                            value={newContact.name} 
                            onChange={e => setNewContact({...newContact, name: e.target.value})} 
                          />
                          <input 
                            type="tel" 
                            className="form-input" 
                            placeholder="10-Digit Mobile" 
                            maxLength={10}
                            style={{ padding: '0.5rem', fontSize: '0.75rem' }} 
                            value={newContact.phone} 
                            onChange={e => setNewContact({...newContact, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select 
                            className="form-select" 
                            style={{ padding: '0.5rem', fontSize: '0.75rem' }} 
                            value={newContact.relation} 
                            onChange={e => setNewContact({...newContact, relation: e.target.value})}
                          >
                            <option value="Spouse">Spouse / Partner</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Child">Child</option>
                            <option value="Primary Physician">Primary Physician</option>
                            <option value="Friend">Friend / Colleague</option>
                          </select>
                          <button 
                            type="button" 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              if (!newContact.name?.trim()) {
                                Swal.fire({
                                  title: 'Validation Error',
                                  text: 'Please provide the contact full name.',
                                  icon: 'warning',
                                  confirmButtonColor: '#6366f1'
                                });
                                return;
                              }
                              const digits = (newContact.phone || '').replace(/\D/g, '');
                              if (digits.length !== 10) {
                                Swal.fire({
                                  title: 'Invalid Mobile Number',
                                  text: 'Phone number must be EXACTLY 10 digits.',
                                  icon: 'warning',
                                  confirmButtonColor: '#6366f1'
                                });
                                return;
                              }
                              if (!/^[6789]\d{9}$/.test(digits)) {
                                Swal.fire({
                                  title: 'Invalid Mobile Number',
                                  text: '10-digit mobile number must start with 6, 7, 8, or 9.',
                                  icon: 'warning',
                                  confirmButtonColor: '#6366f1'
                                });
                                return;
                              }

                              let updatedContacts;
                              if (editingContactId) {
                                updatedContacts = (profile.emergencyContacts || []).map(c => 
                                  (c.id === editingContactId || (!c.id && c.phone === editingContactId))
                                    ? { ...newContact, id: c.id || editingContactId }
                                    : c
                                );
                              } else {
                                updatedContacts = [...(profile.emergencyContacts || []), { ...newContact, id: 'c-' + Date.now() }];
                              }
                              const updatedProfile = { ...profile, emergencyContacts: updatedContacts };
                              setProfile(updatedProfile);
                              api.updateProfile(updatedProfile);
                              
                              Swal.fire({
                                title: editingContactId ? 'Contact Updated!' : 'Contact Added!',
                                text: `${newContact.name} is now saved in your emergency SOS alert list.`,
                                icon: 'success',
                                confirmButtonColor: '#10b981',
                                timer: 1800,
                                showConfirmButton: false
                              });

                              setNewContact({ name: '', phone: '', relation: 'Spouse' });
                              setEditingContactId(null);
                              setShowAddContact(false);
                            }}
                          >
                            {editingContactId ? '💾 Update Contact' : 'Save Contact'}
                          </button>
                          {editingContactId && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setEditingContactId(null);
                                setNewContact({ name: '', phone: '', relation: 'Spouse' });
                                setShowAddContact(false);
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                        profile.emergencyContacts.map(contact => (
                          <div key={contact.id || contact.phone} className="contact-card-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '1.25rem' }}>
                                {contact.relation === 'Primary Physician' ? '🩺' : contact.relation === 'Spouse' ? '💍' : '👤'}
                              </span>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{contact.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {contact.phone} • <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{contact.relation || 'Contact'}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <a 
                                href={`tel:${contact.phone}`} 
                                className="btn btn-outline" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--emerald)', color: 'var(--emerald)' }}
                              >
                                📞 Call
                              </a>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--blue)', borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.08)' }}
                                title="Edit Contact"
                                onClick={() => {
                                  setEditingContactId(contact.id || contact.phone);
                                  setNewContact({
                                    name: contact.name || '',
                                    phone: contact.phone || '',
                                    relation: contact.relation || 'Spouse'
                                  });
                                  setShowAddContact(true);
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem', color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                title="Delete Contact"
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Remove Contact?',
                                    text: `Remove ${contact.name} from emergency notification list?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: '#6b7280',
                                    confirmButtonText: 'Yes, Remove'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      const updatedContacts = profile.emergencyContacts.filter(c => (c.id ? c.id !== contact.id : c.phone !== contact.phone));
                                      const updatedProfile = { ...profile, emergencyContacts: updatedContacts };
                                      setProfile(updatedProfile);
                                      api.updateProfile(updatedProfile);
                                      if (editingContactId === (contact.id || contact.phone)) {
                                        setEditingContactId(null);
                                        setShowAddContact(false);
                                      }
                                      Swal.fire({
                                        title: 'Removed!',
                                        text: `${contact.name} was removed from emergency contacts.`,
                                        icon: 'success',
                                        timer: 1500,
                                        showConfirmButton: false
                                      });
                                    }
                                  });
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                          No emergency contacts added yet. Tap <strong>+ Add Contact</strong> to set up instant notify list.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit / Update Profile Form */}
                  <div className="card" id="edit-citizen-profile">
                    <h3 className="card-title">✏️ Edit Personal & Health Profile</h3>
                    <form onSubmit={handleUpdateProfile}>
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Full Name</label>
                          <input type="text" className="form-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <input type="tel" className="form-input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} required />
                        </div>
                      </div>

                      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label">Blood Group</label>
                          <select className="form-select" value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})}>
                            {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Gender</label>
                          <select className="form-select" value={profile.gender || 'Female'} onChange={e => setProfile({...profile, gender: e.target.value})}>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Date of Birth</label>
                          <input type="date" className="form-input" value={profile.dateOfBirth || '1994-06-15'} onChange={e => setProfile({...profile, dateOfBirth: e.target.value})} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Residential Address</label>
                        <input type="text" className="form-input" placeholder="Street, City, State" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Known Allergies (Medications, Foods, Insect Stings)</label>
                        <input type="text" className="form-input" placeholder="e.g. Penicillin, Peanuts, Latex" value={profile.allergies} onChange={e => setProfile({...profile, allergies: e.target.value})} />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Existing Medical Conditions / Chronic Diseases</label>
                        <textarea className="form-textarea" rows="2" placeholder="e.g. Asthma, Diabetes Type 2, Hypertension" value={profile.medicalHistory} onChange={e => setProfile({...profile, medicalHistory: e.target.value})} />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Current Routine Medications & Dosages</label>
                        <input type="text" className="form-input" placeholder="e.g. Albuterol Inhaler (PRN), Insulin" value={profile.medications || ''} onChange={e => setProfile({...profile, medications: e.target.value})} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.06)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>🫀 Organ Donor Registration</strong>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Display official organ donor badge on digital Emergency ID card</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={profile.organDonor ?? true} 
                          onChange={e => setProfile({...profile, organDonor: e.target.checked})} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        💾 Save & Sync Citizen Profile
                      </button>
                    </form>
                  </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.35rem' }}>🛡️</span>
                          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{volProfile.name}</h3>
                          <span 
                            className={`badge ${volProfile.isVerified ? 'badge-emerald' : 'badge-amber'}`}
                            style={{ cursor: volProfile.isVerified ? 'default' : 'pointer' }}
                            onClick={() => {
                              if (!volProfile.isVerified) {
                                Swal.fire({
                                  title: '⚠️ Verification Pending Admin Review',
                                  text: 'Your registration is submitted. An Alert Life Administrator must review and approve your responder profile in the Admin Console before live emergency dispatches are assigned.',
                                  icon: 'info',
                                  confirmButtonColor: '#6366f1',
                                  confirmButtonText: 'Understood'
                                });
                              }
                            }}
                          >
                            {volProfile.isVerified ? '✓ Verified Responder' : '⚠️ Pending Admin Verification (Locked)'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Cert: <strong>{volProfile.certification || 'Certified First Responder'}</strong> {volProfile.certificationNumber ? `(#${volProfile.certificationNumber})` : ''}
                        </p>
                        {!volProfile.isVerified && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--amber)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--amber-dark, #b45309)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>⏳</span>
                            <span><strong>Pending Admin Approval:</strong> You will gain full responder access once the System Admin approves your registration in the Admin Console.</span>
                          </div>
                        )}
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

                  {/* Incoming Emergency Dispatch Card (Pending Volunteer Acceptance) - Only for Verified Volunteers */}
                  {volProfile.isVerified && sosState && sosState.status !== 'completed' && sosState.status !== 'closed' && sosState.status !== 'declined' && !sosState.volunteerId && (
                    <div className="card" style={{ border: '3px solid var(--red)', background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.08) 0%, rgba(255,255,255,0.95) 100%)', boxShadow: '0 8px 30px rgba(244, 63, 94, 0.25)', animation: 'pulse-border 1.5s infinite' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}>
                            🚨 CITIZEN SOS DISPATCH
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red)', animation: 'pulse-avatar 1s infinite' }}>
                            🔊 ALARM RINGING
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-amber" style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}>
                            ⏱️ Auto-Pass in {sosCountdown}s
                          </span>
                          <span className={`badge ${sosState.severity === 'high' ? 'badge-red' : 'badge-amber'}`}>
                            {sosState.severity === 'high' ? 'HIGH PRIORITY' : 'MODERATE TRIAGE'}
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', color: 'var(--red-dark)', marginBottom: '0.5rem' }}>
                        {sosState.description || 'Emergency Assistance Requested'}
                      </h3>

                      <div style={{ background: 'rgba(255,255,255,0.85)', borderRadius: '12px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>👤 Citizen Name:</span>
                          <strong>{sosState.patientName || 'Citizen In Need'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📞 Citizen Phone:</span>
                          {sosState.patientPhone ? (
                            <a href={`tel:${sosState.patientPhone}`} style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                              {sosState.patientPhone}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Not provided</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>🩸 Blood Group / Allergies:</span>
                          <span><strong>{sosState.patientBlood || 'O+'}</strong> (Allergies: {sosState.allergies || 'None'})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📋 Medical History:</span>
                          <strong>{sosState.medicalHistory || 'None'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📍 Incident Location:</span>
                          <strong style={{ textAlign: 'right', color: 'var(--red-dark)' }}>{sosState.address || `${sosState.lat?.toFixed(4)}°, ${sosState.lng?.toFixed(4)}°`}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>🌐 GPS Coordinates:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{sosState.lat?.toFixed(5)}, {sosState.lng?.toFixed(5)}</span>
                        </div>
                        {sosState.volunteerDistanceKm && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🎯 Live Distance:</span>
                            <span className="badge badge-amber" style={{ fontWeight: 800 }}>{sosState.volunteerDistanceKm} km from your location</span>
                          </div>
                        )}
                        {sosState.lat && sosState.lng && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&destination=${sosState.lat},${sosState.lng}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-outline"
                              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--blue)', color: 'var(--blue)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                            >
                              🗺️ Preview Exact Location on Google Maps ↗
                            </a>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>🏥 Hospital Alert:</span>
                          <span className="badge badge-emerald">🚨 Auto-Alerted & Ambulance Dispatched</span>
                        </div>
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
                          onClick={handlePassSOS}
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
                          onClick={async () => {
                            const newSOS = await api.triggerSOS({
                              lat: 37.7749,
                              lng: -122.4194,
                              description: '🩸 Roadside Skid & Leg Injury (Citizen SOS)',
                              severity: 'high',
                              category: 'road_accident',
                              ambulanceRequested: true,
                              patientProfile: {
                                name: 'Alex Rivera (Citizen)',
                                phone: '+1 (555) 019-4821',
                                bloodGroup: 'O+',
                                allergies: 'Penicillin',
                                medicalHistory: 'Asthma'
                              }
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

                        <div style={{ background: 'rgba(99, 102, 241, 0.06)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>📍 Destination:</span>
                            <strong>{sosState.address || `${sosState.lat?.toFixed(4)}°, ${sosState.lng?.toFixed(4)}°`}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🎯 GPS Target:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{sosState.lat?.toFixed(5)}, {sosState.lng?.toFixed(5)}</span>
                          </div>
                        </div>

                        {/* Interactive Real-Time Map View */}
                        <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.75rem', height: '240px' }}>
                          <iframe
                            title="Live Rescue GPS Route Map"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight="0"
                            marginWidth="0"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${(sosState.lng || 77.6245) - 0.01}%2C${(sosState.lat || 12.9352) - 0.01}%2C${(sosState.lng || 77.6245) + 0.01}%2C${(sosState.lat || 12.9352) + 0.01}&layer=mapnik&marker=${sosState.lat || 12.9352}%2C${sosState.lng || 77.6245}`}
                            style={{ filter: 'contrast(1.05) saturate(1.1)', border: 0 }}
                          />
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            <span>🚨 Citizen SOS Location</span>
                          </div>
                        </div>

                        {/* Direct GPS Turn-by-Turn Navigation Launch Button */}
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${sosState.lat || 12.9352},${sosState.lng || 77.6245}&travelmode=driving`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                        >
                          🧭 Start Live Turn-by-Turn GPS Navigation ↗
                        </a>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                          <span>Dispatch Progress: <strong>{navProgress}%</strong></span>
                          <span>ETA: <strong>{navProgress >= 100 ? '0 mins (Arrived On Scene)' : '2 mins remaining'}</strong></span>
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
            <span className="nav-tab-icon">👤</span>
            {currentRole === 'volunteer' ? 'Credentials' : 'Profile & ID'}
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
                <h2>{rescueLedger.length}</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Network Members</p>
                <h2>{members.length}</h2>
              </div>
              <div className="card">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Payouts Credited</p>
                <h2 style={{ color: 'var(--emerald)' }}>
                  ${rescueLedger.filter(r => r.payoutStatus.includes('Credited')).reduce((acc, curr) => acc + (curr.payoutAmount || 0), 0).toFixed(2)}
                </h2>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>🚨 Real-Time Citizen SOS & Dispatch Controller</h3>
                {sosState && (
                  <span className={`badge ${sosState.status === 'accepted' ? 'badge-blue' : sosState.status === 'arrived' ? 'badge-emerald' : 'badge-red'}`}>
                    {sosState.status?.toUpperCase()}
                  </span>
                )}
              </div>

              {sosState ? (
                <div style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <p><strong>Patient Name:</strong> {sosState.patientName}</p>
                      <p><strong>Patient Phone:</strong> {sosState.patientPhone}</p>
                      <p><strong>Incident / Severity:</strong> {sosState.description} (<span className="badge badge-red">{sosState.severity || 'High'}</span>)</p>
                      <p><strong>Exact Live GPS:</strong> {sosState.lat?.toFixed(4)}, {sosState.lng?.toFixed(4)}</p>
                    </div>
                    <div>
                      <p><strong>Assigned Volunteer:</strong> {sosState.volunteerName ? `${sosState.volunteerName} (✓ AHA Certified)` : 'Matching available nearby responders...'}</p>
                      <p><strong>Volunteer Phone:</strong> {sosState.volunteerPhone || 'N/A'}</p>
                      <p><strong>Ambulance Status:</strong> <span className="badge badge-emerald">{sosState.ambulanceStatus || 'None requested'}</span></p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    {sosState.ambulanceStatus === 'requested' && (
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }} onClick={dispatchAmbulance}>
                        🚑 Confirm Ambulance Dispatch
                      </button>
                    )}
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', borderColor: 'var(--red)', color: 'var(--red)' }}
                      onClick={() => {
                        api.closeSOS();
                        setSosState(null);
                        alert('Emergency case closed by Admin Desk.');
                      }}
                    >
                      ✕ Close & Clear Active Case
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🟢</span>
                  <p>All emergency sectors clear. No active SOS in progress.</p>
                </div>
              )}
            </div>

            {/* Registered Community & Responders Directory */}
            <div className="card">
              <h3 className="card-title">👥 Active Volunteer Responders & Field Network</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem' }}>Responder</th>
                      <th style={{ padding: '0.6rem' }}>Role & Cert</th>
                      <th style={{ padding: '0.6rem' }}>Contact</th>
                      <th style={{ padding: '0.6rem' }}>Verification</th>
                      <th style={{ padding: '0.6rem' }}>Live Duty</th>
                      <th style={{ padding: '0.6rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members && members.filter(m => m.role === 'Volunteer').length > 0 ? (
                      members.filter(m => m.role === 'Volunteer').map((m) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.6rem' }}>
                            <strong>{m.name}</strong>
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span className="badge badge-blue">Volunteer</span>
                          </td>
                          <td style={{ padding: '0.6rem' }}>{m.phone || 'N/A'}</td>
                          <td style={{ padding: '0.6rem' }}>
                            <span className={`badge ${m.isVerified ? 'badge-emerald' : 'badge-amber'}`}>
                              {m.isVerified ? '✓ Verified' : '⚠️ Pending Admin Verification'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem' }}>
                            <span style={{ color: m.isVerified ? 'var(--emerald)' : 'var(--amber)', fontWeight: 700 }}>
                              {m.isVerified ? '🟢 On Duty' : '⏳ Pending Review'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem', display: 'flex', gap: '0.35rem' }}>
                            {!m.isVerified && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} 
                                onClick={() => {
                                  api.verifyVolunteer(m.id).then(() => {
                                    Swal.fire({ title: 'Approved!', text: `${m.name} has been verified and approved as active responder.`, icon: 'success', timer: 1500, showConfirmButton: false });
                                    setMembers(prev => prev.map(item => item.id === m.id ? { ...item, active: true, isVerified: true } : item));
                                  });
                                }}
                              >
                                ✓ Approve
                              </button>
                            )}
                            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => Swal.fire({ title: 'Contacting Responder', text: `Initiating direct emergency channel to ${m.name} (${m.phone || 'N/A'})...`, icon: 'info', confirmButtonColor: '#6366f1' })}>
                              📞 Ping
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.4rem' }}>📭</span>
                          No volunteer responders registered yet. All newly registered field volunteers will appear here for admin verification.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <h3 className="card-title">🚑 Pending Ambulance Dispatches</h3>
              {sosState && (sosState.ambulanceStatus === 'requested' || sosState.ambulanceStatus === 'Dispatched') ? (
                <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.04)' }}>
                  <p><strong>Patient:</strong> {sosState.patientName} ({sosState.patientPhone})</p>
                  <p><strong>Incident Location:</strong> {sosState.lat.toFixed(4)}, {sosState.lng.toFixed(4)}</p>
                  <p><strong>Current Status:</strong> <span className="badge badge-emerald">{sosState.ambulanceStatus} (ETA: {sosState.ambulanceEta || '6 mins'})</span></p>
                  {sosState.ambulanceStatus === 'requested' && (
                    <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={dispatchAmbulance}>
                      Confirm and Dispatch ER Ambulance Unit
                    </button>
                  )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid-2">
              <div className="card">
                <h3 className="card-title">📅 Schedule Health Camp / Webinar</h3>
                <form onSubmit={handleAddWebinar}>
                  <div className="form-group">
                    <label className="form-label">Webinar / Camp Topic</label>
                    <input type="text" className="form-input" placeholder="e.g. Stroke Triage Steps" value={newWebinar.title} onChange={e => setNewWebinar({...newWebinar, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Organizer / Speaker</label>
                    <input type="text" className="form-input" placeholder="Speaker or Hospital name" value={newWebinar.speaker} onChange={e => setNewWebinar({...newWebinar, speaker: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input type="datetime-local" className="form-input" value={newWebinar.date} onChange={e => setNewWebinar({...newWebinar, date: e.target.value})} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish to Citizen Feed</button>
                </form>
              </div>

              <div className="card">
                <h3 className="card-title">📖 Upload Educational Multimedia Guide</h3>
                <form onSubmit={handleAddArticle}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input type="text" className="form-input" placeholder="e.g. CPR Hands placement" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Content Summary</label>
                    <textarea className="form-textarea" rows="4" placeholder="Description of treatment steps..." value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Article to Network</button>
                </form>
              </div>
            </div>

            {/* Moderation List of all Published Camps & Articles */}
            <div className="card">
              <h3 className="card-title">📑 Community Content Moderation (Volunteer & Admin Posts)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {webinars.map(w => (
                  <div key={w.id} style={{ background: 'rgba(16, 185, 129, 0.04)', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div>
                      <strong>🏥 {w.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Organizer: {w.speaker} | {new Date(w.date).toLocaleDateString()} | 👥 {w.attendees || 0} Registered</div>
                    </div>
                    <button className="btn btn-outline" style={{ borderColor: 'var(--red)', color: 'var(--red)', padding: '0.25rem 0.6rem', fontSize: '0.72rem' }} onClick={() => handleDeleteWebinar(w.id, w.title)}>
                      🗑️ Delete
                    </button>
                  </div>
                ))}

                {articles.map(a => (
                  <div key={a.id} style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                      <strong>{a.contentType === 'video' ? '🎬' : a.contentType === 'document' ? '📄' : '📖'} {a.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Author: {a.author || 'Volunteer'} | Category: {a.category}</div>
                    </div>
                    <button className="btn btn-outline" style={{ borderColor: 'var(--red)', color: 'var(--red)', padding: '0.25rem 0.6rem', fontSize: '0.72rem' }} onClick={() => handleDeleteArticle(a.id, a.title)}>
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
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
