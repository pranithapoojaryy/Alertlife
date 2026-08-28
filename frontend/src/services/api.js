// Mock Database and State Management for Alert Life
const DB_VERSION = "v1";

const defaultState = {
  profile: {
    name: "Jane Citizen",
    email: "jane@alertlife.com",
    phone: "+1 (555) 019-2834",
    bloodGroup: "O+",
    emergencyContacts: [
      { name: "John Citizen (Spouse)", phone: "+1 (555) 019-5839" }
    ],
    allergies: "Penicillin, Peanuts",
    medicalHistory: "Asthma since childhood"
  },
  volunteers: [
    { id: "vol-1", name: "David Miller", phone: "+1 (555) 012-3456", certified: true, rating: 4.9, active: true, lat: 37.775, lng: -122.420 },
    { id: "vol-2", name: "Sophia Martinez", phone: "+1 (555) 012-7890", certified: true, rating: 4.8, active: true, lat: 37.778, lng: -122.415 },
    { id: "vol-3", name: "Robert Chen", phone: "+1 (555) 012-1122", certified: false, rating: 4.5, active: true, lat: 37.770, lng: -122.425 }
  ],
  hospitals: [
    { id: "hosp-1", name: "City General Trauma Center", phone: "+1 (555) 014-9900", ambulances: 5, lat: 37.780, lng: -122.412 },
    { id: "hosp-2", name: "St. Jude Memorial Hospital", phone: "+1 (555) 014-8800", ambulances: 3, lat: 37.768, lng: -122.430 }
  ],
  doctors: [
    { id: "doc-1", name: "Dr. Emily Johnson", specialty: "Cardiologist", online: true },
    { id: "doc-2", name: "Dr. Alan Vance", specialty: "Trauma Surgeon", online: true }
  ],
  activeSOS: null, // holds currently active emergency case if any
  casesHistory: [],
  webinars: [
    { id: "web-1", title: "Hands-Only CPR Certification Training", speaker: "Dr. Emily Johnson", date: "2026-09-05T10:00:00", attendees: 124 },
    { id: "web-2", title: "First Aid Basics for Parents & Caregivers", speaker: "David Miller (EMT-B)", date: "2026-09-12T14:30:00", attendees: 88 }
  ],
  articles: [
    { id: "art-1", title: "Recognizing a Stroke: Think F.A.S.T.", category: "Guides", readTime: "4 min read", content: "Learn the signs: Face drooping, Arm weakness, Speech difficulty, Time to call emergency." },
    { id: "art-2", title: "How to Clear an Obstructed Airway (Choking)", category: "CPR & First Aid", readTime: "5 min read", content: "Lean the person forward. Give 5 back blows between the shoulder blades with the heel of your hand. Give 5 abdominal thrusts." }
  ],
  radius: 3.5 // in km
};

const getDB = () => {
  const data = localStorage.getItem(`alertlife_db_${DB_VERSION}`);
  if (!data) {
    localStorage.setItem(`alertlife_db_${DB_VERSION}`, JSON.stringify(defaultState));
    return defaultState;
  }
  return JSON.parse(data);
};

const saveDB = (state) => {
  localStorage.setItem(`alertlife_db_${DB_VERSION}`, JSON.stringify(state));
};

export const api = {
  getProfile: () => getDB().profile,
  updateProfile: (profile) => {
    const db = getDB();
    db.profile = { ...db.profile, ...profile };
    saveDB(db);
    return db.profile;
  },
  getVolunteers: () => getDB().volunteers,
  updateVolunteer: (volId, updates) => {
    const db = getDB();
    db.volunteers = db.volunteers.map(v => v.id === volId ? { ...v, ...updates } : v);
    saveDB(db);
    return db.volunteers;
  },
  getHospitals: () => getDB().hospitals,
  getDoctors: () => getDB().doctors,
  getRadius: () => getDB().radius,
  updateRadius: (r) => {
    const db = getDB();
    db.radius = parseFloat(r);
    saveDB(db);
    return db.radius;
  },
  
  // SOS & Dispatch
  getActiveSOS: () => getDB().activeSOS,
  triggerSOS: (sosData) => {
    const db = getDB();
    const newSOS = {
      id: "sos-" + Date.now(),
      timestamp: new Date().toISOString(),
      lat: sosData.lat || 37.7749,
      lng: sosData.lng || -122.4194,
      description: sosData.description || "Medical Emergency",
      patientName: db.profile.name,
      patientPhone: db.profile.phone,
      patientBlood: db.profile.bloodGroup,
      patientAllergies: db.profile.allergies,
      patientHistory: db.profile.medicalHistory,
      status: "locating", // locating, matched, accepted, hospital_notified, ambulance_dispatched, closed
      volunteerId: null,
      ambulanceStatus: null, // none, requested, dispatched, arrived
      ambulanceEta: null,
      hospitalId: null,
      consultationActive: false,
      volunteerNotes: ""
    };
    db.activeSOS = newSOS;
    saveDB(db);
    return newSOS;
  },
  updateSOS: (updates) => {
    const db = getDB();
    if (db.activeSOS) {
      db.activeSOS = { ...db.activeSOS, ...updates };
      saveDB(db);
    }
    return db.activeSOS;
  },
  closeSOS: () => {
    const db = getDB();
    if (db.activeSOS) {
      db.casesHistory.unshift({ ...db.activeSOS, status: "closed", closedAt: new Date().toISOString() });
      db.activeSOS = null;
      saveDB(db);
    }
    return null;
  },
  getCasesHistory: () => getDB().casesHistory,

  // Webinars & Events
  getWebinars: () => getDB().webinars,
  addWebinar: (webinar) => {
    const db = getDB();
    const newWeb = { id: "web-" + Date.now(), attendees: 0, ...webinar };
    db.webinars.unshift(newWeb);
    saveDB(db);
    return newWeb;
  },
  registerForWebinar: (webId) => {
    const db = getDB();
    db.webinars = db.webinars.map(w => w.id === webId ? { ...w, attendees: w.attendees + 1 } : w);
    saveDB(db);
    return db.webinars;
  },

  // Articles & Guides
  getArticles: () => getDB().articles,
  addArticle: (art) => {
    const db = getDB();
    const newArt = { id: "art-" + Date.now(), ...art };
    db.articles.unshift(newArt);
    saveDB(db);
    return newArt;
  }
};
