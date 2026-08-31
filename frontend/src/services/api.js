import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
    name: "Jane Citizen",
    email: "jane@alertlife.com",
    phone: "+1 (555) 019-2834",
    bloodGroup: "O+",
    allergies: "None",
    medicalHistory: "Asthma"
  },
  activeSOS: null,
  webinars: [
    { id: "web-1", title: "Hands-Only CPR Certification Training", speaker: "Dr. Emily Johnson", date: "2026-09-05T10:00:00", location: "Community Health Center & Online", type: "Webinar", attendees: 124 },
    { id: "web-2", title: "Free Cardiac Health Checkup & Blood Donation Camp", speaker: "David Miller (Lead Responder)", date: "2026-09-12T09:00:00", location: "City Town Hall Ground", type: "Health Camp", attendees: 240 },
    { id: "web-3", title: "Pediatric First Aid & Choking Workshop", speaker: "Dr. Robert Vance (Pediatric ER)", date: "2026-09-18T15:00:00", location: "Metro Medical Center", type: "Health Camp", attendees: 95 }
  ],
  articles: [
    { 
      id: "art-1", 
      title: "Recognizing a Stroke: Think F.A.S.T.", 
      category: "Emergency Guides", 
      contentType: "article",
      readTime: "4 min read", 
      author: "David Miller (Volunteer)",
      date: "Aug 28, 2026",
      content: "Learn the signs: Face drooping on one side, Arm weakness when raised, Speech difficulty or slurring, Time to call emergency services immediately." 
    },
    { 
      id: "art-2", 
      title: "Hands-on CPR Video Demonstration", 
      category: "CPR Training", 
      contentType: "video",
      videoUrl: "https://www.youtube.com/watch?v=M4ACYp75mjU",
      thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
      readTime: "3 min video", 
      author: "Alert Life Response Team",
      date: "Aug 29, 2026",
      content: "Step-by-step video guide explaining hand placement, posture, 2-inch chest compression depth, and 100-120 BPM tempo." 
    },
    { 
      id: "art-3", 
      title: "Community Free Eye & Dental Camp Awareness Poster", 
      category: "Camp Awareness", 
      contentType: "image",
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
      readTime: "Camp Infographic", 
      author: "David Miller (Volunteer)",
      date: "Aug 30, 2026",
      content: "Free general health checkup, blood pressure, sugar screening, and CPR demonstration camp open to all citizens this Saturday." 
    },
    { 
      id: "art-4", 
      title: "Complete First-Aid & Emergency Manual (PDF Guide)", 
      category: "Health Documents", 
      contentType: "document",
      docUrl: "#",
      readTime: "12 pages PDF", 
      author: "Dr. Emily Johnson",
      date: "Aug 25, 2026",
      content: "Official printable medical pocket guide containing burns, choking, fracture splinting, bleeding tourniquets, and snake bite care." 
    }
  ],
  radius: 3.5
};

const getLocalDB = () => {
  const data = localStorage.getItem('alertlife_db_v1');
  if (!data) {
    localStorage.setItem('alertlife_db_v1', JSON.stringify(defaultState));
    return defaultState;
  }
  return JSON.parse(data);
};

const saveLocalDB = (state) => {
  localStorage.setItem('alertlife_db_v1', JSON.stringify(state));
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
  getProfile: async () => {
    try {
      const { data } = await client.get('/citizens/profile');
      if (data.success && data.profile) {
        return {
          name: data.profile.userId?.name || '',
          email: data.profile.userId?.email || '',
          phone: data.profile.userId?.phone || '',
          bloodGroup: data.profile.bloodGroup || 'O+',
          allergies: data.profile.allergies || 'None',
          medicalHistory: data.profile.medicalHistory || 'None'
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
    // Can check backend or return local storage active SOS
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
        severity: sosData.severity || 'high'
      });
      if (data.success) backendSOS = data.emergency;
    } catch (err) {
      console.warn('Failed to trigger backend SOS request, running local simulator.', err);
    }

    const db = getLocalDB();
    const newSOS = {
      id: backendSOS?._id || "sos-" + Date.now(),
      timestamp: new Date().toISOString(),
      lat: sosData.lat || 37.7749,
      lng: sosData.lng || -122.4194,
      description: sosData.description || "Medical Emergency",
      severity: sosData.severity || "high",
      emergencyType: sosData.emergencyType || "medical",
      category: sosData.category || "General Emergency",
      patientName: db.profile?.name || "Jane Citizen",
      patientPhone: db.profile?.phone || "+1 (555) 019-2834",
      patientBlood: db.profile?.bloodGroup || "O+",
      allergies: db.profile?.allergies || "None",
      medicalHistory: db.profile?.medicalHistory || "Asthma",
      status: "locating",
      volunteerId: null,
      volunteerName: null,
      volunteerPhone: null,
      ambulanceStatus: sosData.ambulanceRequested ? "Dispatched" : null,
      ambulanceEta: sosData.ambulanceRequested ? "6 mins" : null
    };
    db.activeSOS = newSOS;
    saveLocalDB(db);
    return newSOS;
  },

  updateSOS: (updates) => {
    const db = getLocalDB();
    if (db.activeSOS) {
      db.activeSOS = { ...db.activeSOS, ...updates };
      saveLocalDB(db);
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
      db.activeSOS = null;
      saveLocalDB(db);
    }
    return null;
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
      { id: 'vol-1', name: 'David Miller', email: 'david@alertlife.com', phone: '+1 (555) 012-3456', bloodGroup: 'A+', role: 'Volunteer', active: true },
      { id: 'vol-2', name: 'Sophia Martinez', email: 'sophia@alertlife.com', phone: '+1 (555) 012-7890', bloodGroup: 'B-', role: 'Volunteer', active: true },
      { id: 'vol-3', name: 'Robert Chen', email: 'robert@alertlife.com', phone: '+1 (555) 012-1122', bloodGroup: 'AB+', role: 'Volunteer', active: false }
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
    if (!db.volunteerProfile) {
      db.volunteerProfile = {
        name: "David Miller",
        email: "david.miller@alertlife.org",
        phone: "+1 (555) 012-3456",
        certification: "AHA Certified First Responder",
        certificationNumber: "EMT-99410-X",
        skills: ["CPR (Adult/Child)", "Automated External Defibrillator (AED)", "Severe Bleeding / Tourniquet", "EpiPen Administration", "Triage Assessment"],
        availabilityStatus: "available",
        serviceRadius: 5,
        isVerified: true,
        totalEmergenciesHandled: 18,
        rating: 4.9,
        experience: 3,
        currentLocation: { latitude: 37.7749, longitude: -122.4194 }
      };
      saveLocalDB(db);
    }
    return db.volunteerProfile;
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
    db.activeSOS = null;
    saveLocalDB(db);
    return true;
  },

  getIncidentHistory: () => {
    const db = getLocalDB();
    return db.incidentHistory || [
      {
        id: 'rep-init-1',
        date: 'Yesterday, 14:20',
        patientCondition: 'Stabilized',
        firstAidProvided: 'Chest Compressions & AED Shock',
        description: 'Citizen had collapsed near market square. Heartbeat recovered before ambulance arrival.',
        vitals: 'BP 120/80 | HR 76'
      },
      {
        id: 'rep-init-2',
        date: 'Aug 24, 2026, 09:15',
        patientCondition: 'Transferred to Hospital',
        firstAidProvided: 'Tourniquet & Pressure Dressing',
        description: 'Laceration from road accident. Bleeding controlled.',
        vitals: 'BP 115/75 | HR 82'
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
  }
};

