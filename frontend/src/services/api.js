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

// Clean Local Storage Database Initial State
const defaultState = {
  profile: {
    name: "",
    email: "",
    phone: "",
    bloodGroup: "O+",
    allergies: "",
    medicalHistory: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContacts: [],
    organDonor: false,
    medications: ""
  },
  activeSOS: null,
  webinars: [],
  rescueLedger: [],
  articles: [],
  radius: 5.0
};

const getLocalDB = () => {
  const data = localStorage.getItem('alertlife_db_v3');
  if (!data) {
    localStorage.setItem('alertlife_db_v3', JSON.stringify(defaultState));
    return defaultState;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultState;
  }
};

const saveLocalDB = (state) => {
  localStorage.setItem('alertlife_db_v3', JSON.stringify(state));
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
      // Check for local credentials fallback
      const registeredUsers = JSON.parse(localStorage.getItem('alertlife_registered_users') || '[]');
      const localFound = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (localFound) {
        if (localFound.password === password) {
          localStorage.setItem('alertlife_token', 'local-token-' + Date.now());
          return localFound;
        } else {
          throw new Error('Invalid password. Please check your credentials.');
        }
      }

      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      
      // Fallback only if no local users registered yet
      if (registeredUsers.length === 0) {
        localStorage.setItem('alertlife_token', 'mock-token');
        const db = getLocalDB();
        const name = email.split('@')[0];
        return { email, name: db.profile.name || name, role: 'citizen' };
      }

      throw new Error(err.response?.data?.message || 'Invalid email or password. Please sign up if you do not have an account.');
    }
  },

  register: async (formData) => {
    // Store in local registered users pool for guaranteed credential check
    const registeredUsers = JSON.parse(localStorage.getItem('alertlife_registered_users') || '[]');
    const existing = registeredUsers.find(u => u.email.toLowerCase() === formData.email.toLowerCase());
    if (existing) {
      throw new Error('This email is already registered. Please sign in.');
    }

    try {
      const { data } = await client.post('/auth/register', formData);
      if (data.token) {
        localStorage.setItem('alertlife_token', data.token);
      }
      
      const newLocalUser = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role || 'citizen',
        bloodGroup: formData.bloodGroup || 'O+'
      };
      registeredUsers.push(newLocalUser);
      localStorage.setItem('alertlife_registered_users', JSON.stringify(registeredUsers));

      const db = getLocalDB();
      db.profile = {
        ...db.profile,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup || 'O+'
      };
      if (formData.role === 'volunteer') {
        db.volunteerProfile = {
          ...db.volunteerProfile,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          certification: formData.certification || 'Certified First Responder'
        };
      }
      saveLocalDB(db);
      return data.user || newLocalUser;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }

      const newLocalUser = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role || 'citizen',
        bloodGroup: formData.bloodGroup || 'O+'
      };
      registeredUsers.push(newLocalUser);
      localStorage.setItem('alertlife_registered_users', JSON.stringify(registeredUsers));
      localStorage.setItem('alertlife_token', 'local-token-' + Date.now());

      const db = getLocalDB();
      db.profile = {
        ...db.profile,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup || 'O+'
      };
      if (formData.role === 'volunteer') {
        db.volunteerProfile = {
          ...db.volunteerProfile,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          certification: formData.certification || 'Certified First Responder'
        };
      }
      saveLocalDB(db);
      return newLocalUser;
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
          allergies: Array.isArray(data.profile.allergies) ? data.profile.allergies.join(', ') : (data.profile.allergies || ''),
          medicalHistory: Array.isArray(data.profile.medicalHistory) ? data.profile.medicalHistory.map(m => m.condition || m).join(', ') : (data.profile.medicalHistory || ''),
          dateOfBirth: data.profile.dateOfBirth ? data.profile.dateOfBirth.slice(0, 10) : (getLocalDB().profile?.dateOfBirth || ''),
          gender: data.profile.gender || getLocalDB().profile?.gender || '',
          address: typeof data.profile.address === 'object' ? `${data.profile.address.street || ''} ${data.profile.address.city || ''} ${data.profile.address.state || ''}`.trim() : (data.profile.address || getLocalDB().profile?.address || ''),
          emergencyContacts: data.profile.emergencyContacts?.length ? data.profile.emergencyContacts : (getLocalDB().profile?.emergencyContacts || []),
          organDonor: data.profile.organDonor ?? (getLocalDB().profile?.organDonor ?? false),
          medications: data.profile.medications || getLocalDB().profile?.medications || ''
        };
      }
    } catch (err) {
      console.warn('Backend profile fetch info:', err.message);
    }
    return getLocalDB().profile;
  },

  updateProfile: async (profileData) => {
    try {
      const { data } = await client.put('/citizens/profile', profileData);
      if (data.success) {
        const db = getLocalDB();
        db.profile = { ...db.profile, ...profileData };
        saveLocalDB(db);
        return data.profile;
      }
    } catch (err) {
      console.warn('Backend profile update info:', err.message);
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
            address: active.location?.address || active.address || `${(active.location?.latitude || 12.9352).toFixed(4)}°, ${(active.location?.longitude || 77.6245).toFixed(4)}°`,
            description: active.description || "Medical Emergency Assistance Requested",
            severity: active.severity || "high",
            emergencyType: active.emergencyType || "medical",
            category: active.emergencyType || "General Emergency",
            patientName: active.patientName || active.citizenId?.name || (typeof active.guestContact === 'object' ? active.guestContact?.phone : '') || "Citizen In Need",
            patientPhone: active.patientPhone || active.citizenId?.phone || active.guestContact?.phone || "",
            patientBlood: active.patientBlood || active.citizenId?.bloodGroup || "O+",
            allergies: active.allergies || "None declared",
            medicalHistory: active.medicalHistory || "None declared",
            status: active.status || "matched",
            volunteerId: active.assignedVolunteers?.[0] ? 'vol-1' : null,
            volunteerName: active.assignedVolunteers?.[0]?.name || (active.assignedVolunteers?.[0] ? 'Assigned Responder' : null),
            volunteerPhone: active.assignedVolunteers?.[0]?.phone || null,
            volunteerCert: 'Certified First Responder',
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
      // Offline fallback
    }
    return getLocalDB().activeSOS;
  },

  triggerSOS: async (sosData) => {
    let backendSOS = null;
    const finalDescription = sosData.description?.trim() || (sosData.category === 'minor_injury' ? 'Minor Injury & First Aid Support' : sosData.category === 'road_accident' ? 'Road Accident & Trauma First Aid' : 'Urgent Emergency SOS');
    const currentProfile = sosData.patientProfile || {};

    try {
      const { data } = await client.post('/emergencies', {
        latitude: sosData.lat,
        longitude: sosData.lng,
        description: finalDescription,
        emergencyType: sosData.emergencyType || sosData.category || 'other',
        severity: sosData.severity || 'high',
        address: sosData.address || `${sosData.lat?.toFixed(4)}, ${sosData.lng?.toFixed(4)}`,
        patientName: currentProfile.name || '',
        patientPhone: currentProfile.phone || '',
        patientBlood: currentProfile.bloodGroup || 'O+',
        allergies: currentProfile.allergies || 'None',
        medicalHistory: currentProfile.medicalHistory || 'None'
      });
      if (data.success) backendSOS = data.emergency;
    } catch (err) {
      console.warn('Live backend SOS sync:', err.message);
    }

    const db = getLocalDB();
    const patientName = currentProfile.name || db.profile?.name || "Citizen In Need";
    const patientPhone = currentProfile.phone || db.profile?.phone || "";
    const patientBlood = currentProfile.bloodGroup || db.profile?.bloodGroup || "O+";
    const patientAllergies = currentProfile.allergies || db.profile?.allergies || "None";
    const patientHistory = currentProfile.medicalHistory || db.profile?.medicalHistory || "None";

    const newSOS = {
      id: backendSOS?._id || "sos-" + Date.now(),
      timestamp: new Date().toISOString(),
      lat: sosData.lat || 12.9352,
      lng: sosData.lng || 77.6245,
      address: sosData.address || `${(sosData.lat || 12.9352).toFixed(4)}°, ${(sosData.lng || 77.6245).toFixed(4)}°`,
      description: finalDescription,
      severity: sosData.severity || "high",
      emergencyType: sosData.emergencyType || sosData.category || "medical",
      category: sosData.category || "General Emergency",
      patientName: patientName,
      patientPhone: patientPhone,
      patientBlood: patientBlood,
      allergies: patientAllergies,
      medicalHistory: patientHistory,
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
          location: e.location || 'Online / Community Center',
          type: e.type || 'Webinar',
          attendees: e.attendees?.length || 0
        }));
      }
    } catch (err) {
      console.warn('Backend events fetch info:', err.message);
    }
    return getLocalDB().webinars || [];
  },

  registerForWebinar: async (webId) => {
    try {
      await client.post(`/events/${webId}/register`);
    } catch (err) {
      console.warn('Failed to register for event on backend.', err);
    }
    const db = getLocalDB();
    db.webinars = (db.webinars || []).map(w => w.id === webId ? { ...w, attendees: (w.attendees || 0) + 1 } : w);
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
      console.warn('Backend articles fetch info:', err.message);
    }
    return getLocalDB().articles || [];
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
            active: v.isVerified ?? v.isActive ?? true,
            isVerified: v.isVerified ?? true
          });
        });
      }
      if (combined.length > 0) return combined;
    } catch (err) {
      console.warn('Backend members fetch info:', err.message);
    }
    
    const db = getLocalDB();
    const membersList = [];
    if (db.profile?.name) {
      membersList.push({
        id: 'curr-cit',
        name: db.profile.name,
        email: db.profile.email,
        phone: db.profile.phone,
        bloodGroup: db.profile.bloodGroup || 'O+',
        role: 'Citizen',
        active: true,
        isVerified: true
      });
    }
    if (db.volunteerProfile?.name) {
      membersList.push({
        id: 'curr-vol',
        name: db.volunteerProfile.name,
        email: db.volunteerProfile.email,
        phone: db.volunteerProfile.phone,
        bloodGroup: 'O+',
        role: 'Volunteer',
        active: db.volunteerProfile.isVerified ?? false,
        isVerified: db.volunteerProfile.isVerified ?? false
      });
    }
    return membersList;
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
          certification: data.profile.certification || 'Certified First Responder',
          certificationNumber: data.profile.certificationNumber || '',
          skills: data.profile.skills || ['CPR', 'AED', 'Choking Relief', 'Bandaging', 'Burn Treatment'],
          availabilityStatus: data.profile.availabilityStatus || 'available',
          serviceRadius: data.profile.serviceRadius || 5,
          isVerified: data.profile.isVerified ?? false,
          totalEmergenciesHandled: data.profile.totalEmergenciesHandled || 0,
          rating: data.profile.rating || 5.0,
          experience: data.profile.experience || 1
        };
      }
    } catch (err) {
      console.warn('Backend volunteer profile fetch info:', err.message);
    }
    const db = getLocalDB();
    return db.volunteerProfile || {
      name: db.profile?.name || "",
      email: db.profile?.email || "",
      phone: db.profile?.phone || "",
      certification: "Certified First Responder",
      certificationNumber: "",
      skills: ["CPR (Adult/Infant)", "AED Defibrillation", "Tourniquet / Bleeding Control", "Choking Relief"],
      availabilityStatus: "available",
      serviceRadius: 5,
      isVerified: true,
      totalEmergenciesHandled: 0,
      rating: 5.0,
      experience: 1,
      currentLocation: { latitude: 12.9352, longitude: 77.6245 }
    };
  },

  updateVolunteerProfile: async (volData) => {
    try {
      const { data } = await client.put('/volunteers/profile', volData);
      if (data.success) {
        const db = getLocalDB();
        db.volunteerProfile = { ...(db.volunteerProfile || {}), ...volData };
        saveLocalDB(db);
        return data.profile;
      }
    } catch (err) {
      console.warn('Backend volunteer update info:', err.message);
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
      console.warn('Backend availability update info:', err.message);
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

  verifyVolunteer: async (volId) => {
    try {
      if (volId && !volId.startsWith('curr-')) {
        await client.put(`/volunteers/${volId}/verify`);
      }
    } catch (err) {
      console.warn('Backend volunteer verify info:', err.message);
    }
    const db = getLocalDB();
    if (db.volunteerProfile) {
      db.volunteerProfile.isVerified = true;
    }
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return true;
  },

  submitIncidentReport: async (emergencyId, reportData) => {
    try {
      if (emergencyId && !emergencyId.startsWith('sos-')) {
        await client.post(`/emergencies/${emergencyId}/report`, reportData);
      }
    } catch (err) {
      console.warn('Backend report submission info:', err.message);
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

    const newRescueLog = {
      id: 'resc-' + Date.now(),
      emergencyId: emergencyId || 'sos-' + Date.now(),
      volunteerName: db.volunteerProfile?.name || 'Volunteer Responder',
      volunteerEmail: db.volunteerProfile?.email || '',
      volunteerPhone: db.volunteerProfile?.phone || '',
      patientName: active?.patientName || 'Citizen',
      patientPhone: active?.patientPhone || '',
      incidentType: active?.description || 'First Aid Intervention',
      severity: active?.severity || 'Moderate',
      location: active ? `${active.lat?.toFixed(4)}, ${active.lng?.toFixed(4)}` : 'Field Location',
      date: new Date().toLocaleString(),
      durationMins: 30,
      status: 'Completed & Verified',
      payoutAmount: active?.severity === 'high' ? 75.00 : 45.00,
      payoutStatus: 'Pending Admin Approval',
      notes: `${reportData.interventions || 'First aid given'} | ${reportData.notes || 'Patient stabilized.'}`
    };

    db.rescueLedger = [newRescueLog, ...(db.rescueLedger || [])];
    db.activeSOS = null;
    saveLocalDB(db);
    return true;
  },

  getIncidentHistory: () => {
    const db = getLocalDB();
    return db.incidentHistory || [];
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
      console.warn('Backend event creation info:', err.message);
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
      console.warn('Backend event update info:', err.message);
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
      console.warn('Backend event deletion info:', err.message);
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
      console.warn('Backend article creation info:', err.message);
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
      console.warn('Backend article update info:', err.message);
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
      console.warn('Backend article deletion info:', err.message);
    }
    const db = getLocalDB();
    db.articles = (db.articles || []).filter(a => a.id !== id);
    saveLocalDB(db);
    return db.articles;
  },

  getRescueLedger: () => {
    const db = getLocalDB();
    return db.rescueLedger || [];
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
    db.rescueLedger = [newLog, ...(db.rescueLedger || [])];
    saveLocalDB(db);
    return db.rescueLedger;
  },

  creditVolunteerPayout: (rescueId) => {
    const db = getLocalDB();
    db.rescueLedger = (db.rescueLedger || []).map(r => {
      if (r.id === rescueId) {
        return { ...r, payoutStatus: 'Credited to Bank Account', creditedAt: new Date().toLocaleDateString() };
      }
      return r;
    });
    saveLocalDB(db);
    return db.rescueLedger;
  }
};

