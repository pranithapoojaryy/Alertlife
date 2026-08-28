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
    { id: "web-1", title: "Hands-Only CPR Certification Training", speaker: "Dr. Emily Johnson", date: "2026-09-05T10:00:00", attendees: 124 },
    { id: "web-2", title: "First Aid Basics for Parents & Caregivers", speaker: "David Miller (EMT-B)", date: "2026-09-12T14:30:00", attendees: 88 }
  ],
  articles: [
    { id: "art-1", title: "Recognizing a Stroke: Think F.A.S.T.", category: "Guides", readTime: "4 min read", content: "Learn the signs: Face drooping, Arm weakness, Speech difficulty, Time to call emergency." },
    { id: "art-2", title: "How to Clear an Obstructed Airway (Choking)", category: "CPR & First Aid", readTime: "5 min read", content: "Lean the person forward. Give 5 back blows between the shoulder blades with the heel of your hand. Give 5 abdominal thrusts." }
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
        emergencyType: 'medical',
        severity: 'high'
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
      patientName: db.profile.name,
      patientPhone: db.profile.phone,
      patientBlood: db.profile.bloodGroup,
      status: "locating",
      volunteerId: null,
      ambulanceStatus: null,
      ambulanceEta: null
    };
    db.activeSOS = newSOS;
    saveLocalDB(db);
    return newSOS;
  },

  updateSOS: (updates) => {
    const db = getLocalDB();
    if (db.activeSOS) {
      db.activeSOS = { ...db.activeSOS, ...updates };
      saveDBLocal(db);
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
      if (data.success && data.content) {
        return data.content.map(c => ({
          id: c._id,
          title: c.title,
          category: c.category || 'Guides',
          readTime: c.readTime || '5 min read',
          content: c.description || c.content
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch articles from backend, using local guides.', err);
    }
    return getLocalDB().articles;
  },

  getRadius: () => getLocalDB().radius
};

// Internal helper for local updates
const saveDBLocal = (state) => {
  localStorage.setItem('alertlife_db_v1', JSON.stringify(state));
};
