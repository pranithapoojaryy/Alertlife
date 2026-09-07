import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://alertlife-nw5j.onrender.com/api';

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('alertlife_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock Local Storage Database Fallback
const defaultState = {
  profile: {
    name: "Pranitha",
    email: "pranitha@alertlife.org",
    phone: "+91 98450 12345",
    bloodGroup: "O+",
    allergies: "None",
    medicalHistory: "None",
    dateOfBirth: "2002-04-12",
    gender: "Female",
    address: "Koramangala 4th Block, Bengaluru, Karnataka 560034",
    emergencyContacts: [
      { id: "c1", name: "Anand Poojary (Father)", phone: "+91 98450 67890", relation: "Parent" },
      { id: "c2", name: "Dr. Ramesh Rao (Clinic)", phone: "+91 80 2553 1122", relation: "Primary Physician" },
      { id: "c3", name: "Pooja Poojary (Sister)", phone: "+91 98450 99887", relation: "Sibling" }
    ],
    organDonor: true,
    medications: "None"
  },
  activeSOS: null,
  webinars: [
    { 
      id: "web-1", 
      title: "Hands-Only CPR & AED Live Certification Workshop", 
      speaker: "Dr. Emily Johnson (AHA Certified Instructor)", 
      date: "2026-09-05T10:00:00", 
      location: "San Francisco Community Health Center & Zoom Live", 
      type: "Webinar", 
      attendees: 148 
    },
    { 
      id: "web-2", 
      title: "Free Cardiac Health Checkup & Blood Donation Camp", 
      speaker: "David Miller (Lead Paramedic Responder)", 
      date: "2026-09-12T09:00:00", 
      location: "City Town Hall Ground (Booth 4A)", 
      type: "Health Camp", 
      attendees: 310 
    },
    { 
      id: "web-3", 
      title: "Pediatric First Aid & Infant Choking Relief Clinic", 
      speaker: "Dr. Robert Vance (Pediatric Emergency Medicine)", 
      date: "2026-09-18T15:00:00", 
      location: "Metro Children's Medical Center Auditorium", 
      type: "Health Camp", 
      attendees: 125 
    },
    { 
      id: "web-4", 
      title: "Stop the Bleed & Severe Trauma Tourniquet Training", 
      speaker: "Captain Marcus Bell (Trauma Specialist)", 
      date: "2026-09-24T11:00:00", 
      location: "Bay Area Fire Department Station 7", 
      type: "Webinar", 
      attendees: 89 
    }
  ],
  rescueLedger: [
    {
      id: "resc-1",
      emergencyId: "sos-101",
      volunteerName: "David Miller",
      volunteerEmail: "david.miller@alertlife.org",
      volunteerPhone: "+1 (555) 012-3456",
      patientName: "Jane Citizen",
      patientPhone: "+1 (555) 019-2834",
      incidentType: "Minor Roadside Scooter Skid",
      severity: "Moderate",
      location: "37.7749, -122.4194 (Market & 4th St)",
      date: "Aug 31, 2026, 14:15",
      durationMins: 28,
      status: "Completed & Verified",
      payoutAmount: 45.00,
      payoutStatus: "Credited to Bank",
      notes: "Arrived in 2.5 mins. Cleaned deep gravel abrasions on forearm with saline, applied sterile pressure dressing, checked radial pulse (78 bpm), and escorted patient safely."
    },
    {
      id: "resc-2",
      emergencyId: "sos-102",
      volunteerName: "David Miller",
      volunteerEmail: "david.miller@alertlife.org",
      volunteerPhone: "+1 (555) 012-3456",
      patientName: "Robert Hayes (62 yrs)",
      patientPhone: "+1 (555) 392-8812",
      incidentType: "Sudden Cardiac Arrest / Unconscious",
      severity: "Critical",
      location: "37.7833, -122.4167 (Union Square Plaza)",
      date: "Aug 30, 2026, 09:40",
      durationMins: 45,
      status: "Completed & Verified",
      payoutAmount: 75.00,
      payoutStatus: "Credited to Bank",
      notes: "Initiated CPR within 90 seconds. Retrieved public AED, delivered 1 biphasic shock at 200J. Normal sinus rhythm restored before SF General Ambulance arrived."
    },
    {
      id: "resc-3",
      emergencyId: "sos-103",
      volunteerName: "Elena Rostova",
      volunteerEmail: "elena@alertlife.org",
      volunteerPhone: "+1 (555) 882-9011",
      patientName: "Marcus Vance",
      patientPhone: "+1 (555) 441-2910",
      incidentType: "Deep Cut Bleeding & Ankle Sprain",
      severity: "Moderate",
      location: "37.7650, -122.4200 (Mission District & 16th)",
      date: "Aug 29, 2026, 18:20",
      durationMins: 32,
      status: "Completed & Verified",
      payoutAmount: 50.00,
      payoutStatus: "Credited to Bank",
      notes: "Applied hemostatic gauze pressure pack, stabilized sprained right ankle with SAM splint. Patient vitals stable (BP 124/80)."
    },
    {
      id: "resc-4",
      emergencyId: "sos-104",
      volunteerName: "Sophia Martinez",
      volunteerEmail: "sophia@alertlife.com",
      volunteerPhone: "+1 (555) 012-7890",
      patientName: "Lucas Wright",
      patientPhone: "+1 (555) 671-8821",
      incidentType: "Acute Asthma Attack / Wheezing",
      severity: "High",
      location: "37.7900, -122.4010 (Financial District)",
      date: "Aug 28, 2026, 12:05",
      durationMins: 24,
      status: "Pending Admin Credit",
      payoutAmount: 60.00,
      payoutStatus: "Pending Approval",
      notes: "Assisted citizen with spacer inhaler administration, guided calm diaphragmatic breathing, oxygen saturation monitored at 96%."
    }
  ],
  articles: [
    { 
      id: "art-1", 
      title: "Recognizing a Stroke: Think F.A.S.T. Protocol", 
      category: "Emergency Guides", 
      contentType: "article",
      readTime: "4 min read", 
      author: "Dr. Emily Johnson (Chief Medical Officer)",
      date: "Aug 30, 2026",
      content: "F - Face Drooping: Ask person to smile. Does one side droop? A - Arm Weakness: Raise both arms. Does one drift downward? S - Speech Difficulty: Slurred or strange speech? T - Time to call 911 immediately. Every minute saves 1.9 million brain neurons." 
    },
    { 
      id: "art-2", 
      title: "Hands-Only CPR & AED Video Demonstration", 
      category: "CPR Training", 
      contentType: "video",
      videoUrl: "https://www.youtube.com/watch?v=M4ACYp75mjU",
      thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
      readTime: "3 min video", 
      author: "Alert Life Paramedic Team",
      date: "Aug 29, 2026",
      content: "Watch high-yield practical demonstration: Correct interlocked palm placement on lower half of breastbone, 2 to 2.4-inch compression depth, 100-120 beats per minute tempo (Stayin' Alive beat), and seamless AED electrode pad attachment." 
    },
    { 
      id: "art-3", 
      title: "Citywide Free Cardiac Health Camp & Blood Drive Poster", 
      category: "Camp Awareness", 
      contentType: "image",
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
      readTime: "Camp Infographic", 
      author: "David Miller (Lead Responder)",
      date: "Aug 31, 2026",
      content: "Free comprehensive blood pressure screening, random blood glucose testing, ECG on spot for seniors, O-negative urgent blood donor registration, and live Heimlich maneuver practice." 
    },
    { 
      id: "art-4", 
      title: "Official Citizen First-Aid & Emergency Response Pocket Manual", 
      category: "Health Documents", 
      contentType: "document",
      docUrl: "#",
      readTime: "16 pages PDF", 
      author: "American Heart Association & Alert Life",
      date: "Aug 26, 2026",
      content: "Step-by-step practical guide covering 2nd degree burn cooling, Sam-splint fracture immobilization, EpiPen auto-injector administration, bee sting anaphylaxis management, and seizure safety protocols." 
    },
    {
      id: "art-5",
      title: "Choking Relief: Conscious Adult & Infant Heimlich Maneuver",
      category: "Emergency Guides",
      contentType: "article",
      readTime: "3 min read",
      author: "Elena Rostova (EMT-B)",
      date: "Aug 27, 2026",
      content: "For adults: 5 firm back blows between shoulder blades followed by 5 upward abdominal thrusts above navel. For infants under 1 yr: 5 chest thrusts with 2 fingers and 5 gentle downward back slaps over your knee."
    }
  ],
  radius: 5.0
};

const getLocalDB = () => {
  const data = localStorage.getItem('alertlife_db_v2');
  if (!data) {
    localStorage.setItem('alertlife_db_v2', JSON.stringify(defaultState));
    return defaultState;
  }
  return JSON.parse(data);
};

const saveLocalDB = (state) => {
  localStorage.setItem('alertlife_db_v2', JSON.stringify(state));
};

export const api = {
  // Auth & Session
  login: async (email, password) => {
    try {
      const { data } = await client.post('/auth/login', { email, password });
      if (data.token) {
        localStorage.setItem('alertlife_token', data.token);
      }
      return data.user;
    } catch (err) {
      // Fallback
      console.warn('Backend login failed, using local fallback session.', err);
      localStorage.setItem('alertlife_token', 'mock-token');
      return { email, name: email.split('@')[0], role: 'citizen' };
    }
  },

  register: async (formData) => {
    try {
      const { data } = await client.post('/auth/register', { ...formData, role: 'citizen' });
      if (data.token) {
        localStorage.setItem('alertlife_token', data.token);
      }
      return data.user;
    } catch (err) {
      // Fallback
      console.warn('Backend registration failed, using local fallback.', err);
      localStorage.setItem('alertlife_token', 'mock-token');
      const db = getLocalDB();
      db.profile = { ...db.profile, ...formData };
      saveLocalDB(db);
      return { email: formData.email, name: formData.name, role: 'citizen' };
    }
  },

  // Profile Card
  getProfileSync: () => {
    return getLocalDB().profile;
  },

  getProfile: async () => {
    try {
      const { data } = await client.get('/citizens/profile');
      if (data.success && data.profile) {
        return {
          name: data.profile.userId?.name || getLocalDB().profile?.name || '',
          email: data.profile.userId?.email || getLocalDB().profile?.email || '',
          phone: data.profile.userId?.phone || getLocalDB().profile?.phone || '',
          bloodGroup: data.profile.bloodGroup || getLocalDB().profile?.bloodGroup || 'O+',
          allergies: Array.isArray(data.profile.allergies) ? data.profile.allergies.join(', ') : (data.profile.allergies || getLocalDB().profile?.allergies || 'None'),
          medicalHistory: Array.isArray(data.profile.medicalHistory) ? data.profile.medicalHistory.map(m => m.condition || m).join(', ') : (data.profile.medicalHistory || getLocalDB().profile?.medicalHistory || 'None'),
          dateOfBirth: data.profile.dateOfBirth ? data.profile.dateOfBirth.slice(0, 10) : (getLocalDB().profile?.dateOfBirth || '1994-06-15'),
          gender: data.profile.gender || getLocalDB().profile?.gender || 'Female',
          address: typeof data.profile.address === 'object' ? `${data.profile.address.street || ''} ${data.profile.address.city || ''} ${data.profile.address.state || ''}`.trim() : (data.profile.address || getLocalDB().profile?.address || '742 Evergreen Terrace, San Francisco, CA'),
          emergencyContacts: data.profile.emergencyContacts?.length ? data.profile.emergencyContacts : (getLocalDB().profile?.emergencyContacts || []),
          organDonor: data.profile.organDonor ?? (getLocalDB().profile?.organDonor ?? true),
          medications: data.profile.medications || getLocalDB().profile?.medications || 'Albuterol Inhaler (as needed)'
        };
      }
    } catch (err) {
      console.warn('Failed to fetch profile from backend, serving local profile.', err);
    }
    return getLocalDB().profile;
  },

  updateProfile: async (profileData) => {
    try {
      const { data } = await client.put('/citizens/profile', profileData);
      if (data.success) return data.profile;
    } catch (err) {
      console.warn('Failed to update backend profile, saving locally.', err);
    }
    const db = getLocalDB();
    db.profile = { ...db.profile, ...profileData };
    saveLocalDB(db);
    return db.profile;
  },

  // SOS requests
  getActiveSOS: () => {
    return getLocalDB().activeSOS;
  },

  syncActiveSOSFromBackend: async () => {
    try {
      const { data } = await client.get('/emergencies');
      if (data.success && data.emergencies && data.emergencies.length > 0) {
        const active = data.emergencies.find(e => e.status !== 'resolved' && e.status !== 'closed' && e.status !== 'cancelled');
        if (active) {
          const db = getLocalDB();
          const mapped = {
            id: active._id,
            timestamp: active.createdAt || new Date().toISOString(),
            lat: active.location?.latitude || 12.9352,
            lng: active.location?.longitude || 77.6245,
            description: active.description || "Medical Emergency",
            severity: active.severity || "high",
            emergencyType: active.emergencyType || "medical",
            category: active.emergencyType || "General Emergency",
            patientName: active.citizenId?.name || db.profile?.name || "Pranitha",
            patientPhone: active.citizenId?.phone || db.profile?.phone || "+91 98450 12345",
            patientBlood: db.profile?.bloodGroup || "O+",
            allergies: db.profile?.allergies || "None",
            medicalHistory: db.profile?.medicalHistory || "None",
            status: active.status || "matched",
            volunteerId: active.assignedVolunteers?.[0] ? 'vol-1' : null,
            volunteerName: active.assignedVolunteers?.[0] ? 'David Miller' : null,
            volunteerPhone: active.assignedVolunteers?.[0] ? '+1 (555) 012-3456' : null,
            volunteerCert: 'AHA Certified Responder',
            ambulanceStatus: active.ambulanceRequest ? "Dispatched" : null,
            ambulanceEta: active.ambulanceRequest ? "6 mins" : null
          };
          db.activeSOS = mapped;
          saveLocalDB(db);
          window.dispatchEvent(new Event('alertlife_storage_update'));
          return mapped;
        }
      }
    } catch (err) {
      // Offline fallback note
    }
    return getLocalDB().activeSOS;
  },

  triggerSOS: async (sosData) => {
    let backendSOS = null;
    try {
      const { data } = await client.post('/emergencies', {
        latitude: sosData.lat,
        longitude: sosData.lng,
        description: sosData.description,
        emergencyType: sosData.emergencyType || 'medical',
        severity: sosData.severity || 'high',
        address: sosData.address || `${sosData.lat?.toFixed(4)}, ${sosData.lng?.toFixed(4)}`
      });
      if (data.success) backendSOS = data.emergency;
    } catch (err) {
      console.warn('Live backend SOS sync:', err.message);
    }

    const db = getLocalDB();
    const currentProfile = sosData.patientProfile || db.profile || {};

    const newSOS = {
      id: backendSOS?._id || "sos-" + Date.now(),
      timestamp: new Date().toISOString(),
      lat: sosData.lat || 12.9352,
      lng: sosData.lng || 77.6245,
      description: sosData.description || "Medical Emergency",
      severity: sosData.severity || "high",
      emergencyType: sosData.emergencyType || "medical",
      category: sosData.category || "General Emergency",
      patientName: currentProfile.name || db.profile?.name || "Pranitha",
      patientPhone: currentProfile.phone || db.profile?.phone || "+91 98450 12345",
      patientBlood: currentProfile.bloodGroup || db.profile?.bloodGroup || "O+",
      allergies: currentProfile.allergies || db.profile?.allergies || "None",
      medicalHistory: currentProfile.medicalHistory || db.profile?.medicalHistory || "None",
      status: "matched",
      volunteerId: null,
      volunteerName: null,
      volunteerPhone: null,
      ambulanceStatus: sosData.ambulanceRequested ? "Dispatched" : null,
      ambulanceEta: sosData.ambulanceRequested ? "6 mins" : null
    };
    db.activeSOS = newSOS;
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return newSOS;
  },

  updateSOS: async (updates) => {
    const db = getLocalDB();
    if (db.activeSOS) {
      db.activeSOS = { ...db.activeSOS, ...updates };
      saveLocalDB(db);
      window.dispatchEvent(new Event('alertlife_storage_update'));

      // If backend emergency id exists, update backend
      if (db.activeSOS.id && !db.activeSOS.id.startsWith('sos-')) {
        try {
          if (updates.status) {
            await client.put(`/emergencies/${db.activeSOS.id}/status`, { status: updates.status });
          }
        } catch (e) {
          console.warn('Backend status update note:', e.message);
        }
      }
    }
    return db.activeSOS;
  },

  closeSOS: async () => {
    const db = getLocalDB();
    const active = db.activeSOS;
    if (active) {
      try {
        if (!active.id.startsWith('sos-')) {
          await client.put(`/emergencies/${active.id}/status`, { status: 'closed' });
        }
      } catch (err) {
        console.warn('Failed to close backend SOS request.', err);
      }
    }
    db.activeSOS = null;
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return true;
  },

  // Webinars & articles
  getWebinars: async () => {
    try {
      const { data } = await client.get('/events');
      if (data.success && data.events) {
        return data.events.map(e => ({
          id: e._id,
          title: e.title,
          speaker: e.speaker || 'Certified Instructor',
          date: e.date,
          attendees: e.attendees?.length || 0
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch events from backend, using local webinars.', err);
    }
    return getLocalDB().webinars;
  },

  registerForWebinar: async (webId) => {
    try {
      await client.post(`/events/${webId}/register`);
    } catch (err) {
      console.warn('Failed to register for event on backend.', err);
    }
    const db = getLocalDB();
    db.webinars = db.webinars.map(w => w.id === webId ? { ...w, attendees: w.attendees + 1 } : w);
    saveLocalDB(db);
    return db.webinars;
  },

  getArticles: async () => {
    try {
      const { data } = await client.get('/education');
      if (data.success && (data.contents || data.content)) {
        const rawList = data.contents || data.content;
        return rawList.map(c => ({
          id: c._id,
          title: c.title,
          category: c.category || 'Guides',
          contentType: c.contentType || 'article',
          readTime: c.readTime || (c.contentType === 'video' ? '3 min video' : c.contentType === 'document' ? 'PDF Guide' : '5 min read'),
          videoUrl: c.videoUrl || null,
          thumbnail: c.thumbnail || null,
          imageUrl: c.imageUrl || c.filePath || null,
          docUrl: c.filePath || c.docUrl || '#',
          author: c.author?.name || 'Volunteer Responder',
          content: c.description || c.content
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch articles from backend, using local guides.', err);
    }
    const db = getLocalDB();
    // If localDB articles lack contentType, migrate with default rich articles
    if (db.articles && db.articles.length > 0 && !db.articles.some(a => a.contentType === 'video')) {
      db.articles = defaultState.articles;
      saveLocalDB(db);
    }
    return db.articles || defaultState.articles;
  },

  getMembers: async () => {
    try {
      const { data: citData } = await client.get('/citizens');
      const { data: volData } = await client.get('/volunteers');
      const combined = [];
      if (citData.success && citData.citizens) {
        citData.citizens.forEach(c => {
          combined.push({
            id: c._id,
            name: c.userId?.name || 'Citizen',
            email: c.userId?.email || '',
            phone: c.userId?.phone || '',
            bloodGroup: c.bloodGroup || 'O+',
            role: 'Citizen',
            active: c.userId?.isActive !== false
          });
        });
      }
      if (volData.success && volData.volunteers) {
        volData.volunteers.forEach(v => {
          combined.push({
            id: v._id,
            name: v.userId?.name || 'Volunteer',
            email: v.userId?.email || '',
            phone: v.userId?.phone || '',
            bloodGroup: 'O+',
            role: 'Volunteer',
            active: v.isActive
          });
        });
      }
      if (combined.length > 0) return combined;
    } catch (err) {
      console.warn('Failed to fetch members list from backend, using local fallback.', err);
    }
    
    const db = getLocalDB();
    const mockMembers = [
      { id: 'curr-cit', name: db.profile.name, email: db.profile.email, phone: db.profile.phone, bloodGroup: db.profile.bloodGroup, role: 'Citizen', active: true },
      { id: 'vol-1', name: 'David Miller', email: 'david.miller@alertlife.org', phone: '+1 (555) 012-3456', bloodGroup: 'A+', role: 'Volunteer (Paramedic)', active: true },
      { id: 'vol-2', name: 'Sophia Martinez', email: 'sophia@alertlife.org', phone: '+1 (555) 012-7890', bloodGroup: 'B-', role: 'Volunteer (EMT-Advanced)', active: true },
      { id: 'vol-3', name: 'Dr. Robert Vance', email: 'robert.vance@alertlife.org', phone: '+1 (555) 304-1182', bloodGroup: 'O+', role: 'Physician Advisor', active: true },
      { id: 'vol-4', name: 'Elena Rostova', email: 'elena@alertlife.org', phone: '+1 (555) 882-9011', bloodGroup: 'AB+', role: 'Volunteer (First Responder)', active: true },
      { id: 'vol-5', name: 'Captain Marcus Bell', email: 'marcus.bell@sffd.org', phone: '+1 (555) 771-4402', bloodGroup: 'O-', role: 'Volunteer (Trauma EMT)', active: true }
    ];
    return mockMembers;
  },

  // Volunteer Profile & Location
  getVolunteerProfile: async () => {
    try {
      const { data } = await client.get('/volunteers/profile');
      if (data.success && data.profile) {
        return {
          name: data.profile.userId?.name || '',
          email: data.profile.userId?.email || '',
          phone: data.profile.userId?.phone || '',
          certification: data.profile.certification || 'CPR / First-Aid Certified',
          certificationNumber: data.profile.certificationNumber || 'FA-99214',
          skills: data.profile.skills || ['CPR', 'AED', 'Choking Relief', 'Bandaging', 'Burn Treatment'],
          availabilityStatus: data.profile.availabilityStatus || 'available',
          serviceRadius: data.profile.serviceRadius || 5,
          isVerified: data.profile.isVerified ?? true,
          totalEmergenciesHandled: data.profile.totalEmergenciesHandled || 14,
          rating: data.profile.rating || 4.9,
          experience: data.profile.experience || 3
        };
      }
    } catch (err) {
      console.warn('Failed to fetch volunteer profile from backend, using local state.', err);
    }
    const db = getLocalDB();
    return db.volunteerProfile || {
      name: "David Miller",
      email: "david.miller@alertlife.org",
      phone: "+1 (555) 012-3456",
      certification: "AHA Certified Paramedic First Responder",
      certificationNumber: "EMT-99410-X",
      skills: ["CPR (Adult/Infant)", "AED Defibrillation", "Tourniquet / Bleeding Control", "EpiPen / Anaphylaxis", "Airway Clearance & SAM Splinting"],
      availabilityStatus: "available",
      serviceRadius: 5,
      isVerified: true,
      totalEmergenciesHandled: 23,
      rating: 4.96,
      experience: 4,
      currentLocation: { latitude: 37.7749, longitude: -122.4194 }
    };
  },

  updateVolunteerProfile: async (volData) => {
    try {
      const { data } = await client.put('/volunteers/profile', volData);
      if (data.success) return data.profile;
    } catch (err) {
      console.warn('Failed to update backend volunteer profile, updating local.', err);
    }
    const db = getLocalDB();
    db.volunteerProfile = { ...(db.volunteerProfile || {}), ...volData };
    saveLocalDB(db);
    return db.volunteerProfile;
  },

  updateVolunteerAvailability: async (status, latitude, longitude) => {
    try {
      await client.put('/volunteers/availability', { availabilityStatus: status, latitude, longitude });
    } catch (err) {
      console.warn('Failed to update availability on backend, updating local state.', err);
    }
    const db = getLocalDB();
    if (db.volunteerProfile) {
      db.volunteerProfile.availabilityStatus = status;
      if (latitude && longitude) {
        db.volunteerProfile.currentLocation = { latitude, longitude, lastUpdated: new Date().toISOString() };
      }
      saveLocalDB(db);
    }
    return db.volunteerProfile;
  },

  submitIncidentReport: async (emergencyId, reportData) => {
    try {
      if (emergencyId && !emergencyId.startsWith('sos-')) {
        await client.post(`/emergencies/${emergencyId}/report`, reportData);
      }
    } catch (err) {
      console.warn('Failed to post report to backend, handling locally.', err);
    }
    const db = getLocalDB();
    const active = db.activeSOS;
    if (db.volunteerProfile) {
      db.volunteerProfile.totalEmergenciesHandled = (db.volunteerProfile.totalEmergenciesHandled || 0) + 1;
      db.volunteerProfile.availabilityStatus = 'available';
    }
    if (!db.incidentHistory) db.incidentHistory = [];
    db.incidentHistory.unshift({
      id: 'rep-' + Date.now(),
      date: new Date().toLocaleString(),
      ...reportData
    });

    // Automatically record into Admin Rescue Ledger for Salary/Stipend tracking
    const newRescueLog = {
      id: 'resc-' + Date.now(),
      emergencyId: emergencyId || 'sos-' + Date.now(),
      volunteerName: db.volunteerProfile?.name || 'David Miller',
      volunteerEmail: db.volunteerProfile?.email || 'david.miller@alertlife.org',
      volunteerPhone: db.volunteerProfile?.phone || '+1 (555) 012-3456',
      patientName: active?.patientName || 'Jane Citizen',
      patientPhone: active?.patientPhone || '+1 (555) 019-2834',
      incidentType: active?.description || 'First Aid Intervention',
      severity: active?.severity || 'Moderate',
      location: active ? `${active.lat?.toFixed(4)}, ${active.lng?.toFixed(4)}` : 'Downtown Area',
      date: new Date().toLocaleString(),
      durationMins: 35,
      status: 'Completed & Verified',
      payoutAmount: active?.severity === 'high' ? 75.00 : 45.00,
      payoutStatus: 'Pending Admin Approval',
      notes: `${reportData.interventions || 'First aid given'} | ${reportData.notes || 'Patient stabilized.'}`
    };

    db.rescueLedger = [newRescueLog, ...(db.rescueLedger || defaultState.rescueLedger || [])];
    db.activeSOS = null;
    saveLocalDB(db);
    return true;
  },

  getIncidentHistory: () => {
    const db = getLocalDB();
    return db.incidentHistory || [
      {
        id: 'rep-init-1',
        date: 'Today, 14:20',
        patientCondition: 'Stabilized / Awake',
        firstAidProvided: 'Chest Compressions 2 Cycles & AED Shock Delivered',
        description: 'Elderly citizen collapsed near Union Square market. Pulse regained, airway cleared, handed over to paramedics.',
        vitals: 'BP 122/82 | HR 84 bpm | SpO2 98%'
      },
      {
        id: 'rep-init-2',
        date: 'Yesterday, 09:15',
        patientCondition: 'Transferred to Hospital Safe',
        firstAidProvided: 'CAT Tourniquet & Hemostatic Gauze Dressing',
        description: 'Deep leg laceration from scooter collision. Arterial bleeding arrested in 90 seconds.',
        vitals: 'BP 118/76 | HR 80 bpm | SpO2 99%'
      },
      {
        id: 'rep-init-3',
        date: 'Aug 29, 2026, 16:45',
        patientCondition: 'Relieved & Conscious',
        firstAidProvided: 'Heimlich Abdominal Thrusts (4 Repetitions)',
        description: 'Foreign body airway obstruction (food bolus) at downtown restaurant. Complete obstruction dislodged safely.',
        vitals: 'BP 128/84 | HR 92 bpm | SpO2 97%'
      }
    ];
  },

  getRadius: () => getLocalDB().radius || 5,

  updateRadius: (val) => {
    const db = getLocalDB();
    db.radius = val;
    saveLocalDB(db);
  },

  addWebinar: async (webinarData) => {
    try {
      await client.post('/events', { ...webinarData, type: 'webinar' });
    } catch (err) {
      console.warn('Failed to add webinar to backend, saving locally.', err);
    }
    const db = getLocalDB();
    db.webinars = [...(db.webinars || []), { id: 'web-' + Date.now(), ...webinarData, attendees: 0 }];
    saveLocalDB(db);
    return db.webinars;
  },

  updateWebinar: async (id, webinarData) => {
    try {
      if (id && !id.startsWith('web-')) {
        await client.put(`/events/${id}`, webinarData);
      }
    } catch (err) {
      console.warn('Failed to update event on backend, updating locally.', err);
    }
    const db = getLocalDB();
    db.webinars = (db.webinars || []).map(w => w.id === id ? { ...w, ...webinarData } : w);
    saveLocalDB(db);
    return db.webinars;
  },

  deleteWebinar: async (id) => {
    try {
      if (id && !id.startsWith('web-')) {
        await client.delete(`/events/${id}`);
      }
    } catch (err) {
      console.warn('Failed to delete event on backend, deleting locally.', err);
    }
    const db = getLocalDB();
    db.webinars = (db.webinars || []).filter(w => w.id !== id);
    saveLocalDB(db);
    return db.webinars;
  },

  addArticle: async (articleData) => {
    try {
      await client.post('/education', articleData);
    } catch (err) {
      console.warn('Failed to add article to backend, saving locally.', err);
    }
    const db = getLocalDB();
    db.articles = [...(db.articles || []), { id: 'art-' + Date.now(), ...articleData }];
    saveLocalDB(db);
    return db.articles;
  },

  updateArticle: async (id, articleData) => {
    try {
      if (id && !id.startsWith('art-')) {
        await client.put(`/education/${id}`, articleData);
      }
    } catch (err) {
      console.warn('Failed to update article on backend, updating locally.', err);
    }
    const db = getLocalDB();
    db.articles = (db.articles || []).map(a => a.id === id ? { ...a, ...articleData } : a);
    saveLocalDB(db);
    return db.articles;
  },

  deleteArticle: async (id) => {
    try {
      if (id && !id.startsWith('art-')) {
        await client.delete(`/education/${id}`);
      }
    } catch (err) {
      console.warn('Failed to delete article on backend, deleting locally.', err);
    }
    const db = getLocalDB();
    db.articles = (db.articles || []).filter(a => a.id !== id);
    saveLocalDB(db);
    return db.articles;
  },

  // Volunteer Rescue Work & Salary / Stipend Ledger
  getRescueLedger: () => {
    const db = getLocalDB();
    return db.rescueLedger || defaultState.rescueLedger || [];
  },

  recordRescueWork: (logData) => {
    const db = getLocalDB();
    const newLog = {
      id: 'resc-' + Date.now(),
      date: new Date().toLocaleString(),
      status: 'Completed & Verified',
      payoutAmount: logData.severity === 'high' || logData.severity === 'Critical' ? 75.00 : 45.00,
      payoutStatus: 'Pending Admin Approval',
      ...logData
    };
    db.rescueLedger = [newLog, ...(db.rescueLedger || defaultState.rescueLedger || [])];
    saveLocalDB(db);
    return db.rescueLedger;
  },

  creditVolunteerPayout: (rescueId) => {
    const db = getLocalDB();
    db.rescueLedger = (db.rescueLedger || defaultState.rescueLedger || []).map(r => {
      if (r.id === rescueId) {
        return { ...r, payoutStatus: 'Credited to Bank Account', creditedAt: new Date().toLocaleDateString() };
      }
      return r;
    });
    saveLocalDB(db);
    return db.rescueLedger;
  }
};

