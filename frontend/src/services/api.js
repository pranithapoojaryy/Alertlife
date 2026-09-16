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
  volunteerProfile: {
    name: "",
    email: "",
    phone: "",
    certification: "Certified First Responder",
    certificationNumber: "",
    skills: ['CPR (Adult/Pediatric)', 'AED Defibrillation', 'Tourniquet / Bleeding Control', 'Choking Relief'],
    availabilityStatus: "available",
    serviceRadius: 5,
    isVerified: false,
    totalEmergenciesHandled: 0,
    rating: 5.0,
    experience: 1,
    currentLocation: { latitude: 12.9352, longitude: 77.6245 }
  },
  activeSOS: null,
  webinars: [],
  rescueLedger: [],
  articles: [],
  incidentHistory: [],
  radius: 5.0
};

const DB_KEY = 'alertlife_db_v6';

const getLocalDB = () => {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultState;
  }
};

const saveLocalDB = (state) => {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
};

export const api = {
  // Live GPS sync helper with continuous tracking
  syncLiveLocation: async (role = 'volunteer') => {
    if (typeof window === 'undefined' || !navigator.geolocation) return null;
    
    // 1. One-time instant high-accuracy fix
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const db = getLocalDB();
        if (role === 'volunteer') {
          if (db.volunteerProfile) {
            db.volunteerProfile.currentLocation = { latitude, longitude, lastUpdated: new Date().toISOString() };
          }
          try {
            await client.put('/volunteers/availability', {
              availabilityStatus: db.volunteerProfile?.availabilityStatus || 'available',
              latitude,
              longitude
            });
          } catch (e) {
            console.warn('Volunteer live location sync info:', e.message);
          }
        } else {
          if (db.profile) {
            db.profile.currentLocation = { latitude, longitude, lastUpdated: new Date().toISOString() };
          }
          try {
            await client.put('/citizens/location', { latitude, longitude });
          } catch (e) {
            console.warn('Citizen live location sync info:', e.message);
          }
        }
        saveLocalDB(db);
        window.dispatchEvent(new Event('alertlife_storage_update'));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
    );

    // 2. Continuous watchPosition for live movement tracking
    if (!window._alertlife_geo_watch) {
      window._alertlife_geo_watch = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const db = getLocalDB();
          if (role === 'volunteer') {
            if (db.volunteerProfile) {
              db.volunteerProfile.currentLocation = { latitude, longitude, lastUpdated: new Date().toISOString() };
            }
          } else {
            if (db.profile) {
              db.profile.currentLocation = { latitude, longitude, lastUpdated: new Date().toISOString() };
            }
          }
          saveLocalDB(db);
          window.dispatchEvent(new Event('alertlife_storage_update'));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
  },

  // 🔔 Live System / Push Notification Requester & Dispatcher (works even if app is backgrounded/minimized)
  requestNotificationPermission: async () => {
    if (!('Notification' in window)) return 'unsupported';
    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      return permission;
    } catch {
      return 'denied';
    }
  },

  sendLivePushNotification: async ({ title, body, icon, tag, data }) => {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      // Check for Active ServiceWorker Registration for persistent OS-level push notifications
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.showNotification) {
          registration.showNotification(title || '🚨 Alert Life System', {
            body: body || 'Emergency action taken.',
            icon: icon || '/favicon.svg',
            badge: '/favicon.svg',
            tag: tag || 'alertlife-live-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            vibrate: [350, 150, 350, 250, 500],
            data: data || { url: window.location.href }
          });
          return;
        }
      }

      // Fallback to Native Notification constructor
      new Notification(title || '🚨 Alert Life System', {
        body: body || 'Emergency action taken.',
        icon: icon || '/favicon.svg',
        tag: tag || 'alertlife-live-' + Date.now()
      });
    } catch (e) {
      console.warn('Notification trigger info:', e.message);
    }
  },

  // Auth & Session
  login: async (identifier, password, currentRole = 'citizen') => {
    try {
      const { data } = await client.post('/auth/login', { identifier, email: identifier, password });
      if (data.token) {
        localStorage.setItem('alertlife_token', data.token);
      }
      
      // Proactively sync live GPS after login
      if (data.user) {
        api.syncLiveLocation(data.user.role || currentRole).catch(() => {});
      }
      return data.user;
    } catch (err) {
      const cleanInput = identifier.trim().toLowerCase();
      const digitsOnly = identifier.replace(/\D/g, '');
      const last10 = digitsOnly.slice(-10);
      const isEmail = identifier.includes('@');

      // If backend login failed (e.g. user not found in DB), attempt automatic registration on live backend
      try {
        const autoName = isEmail 
          ? identifier.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
          : 'Responder ' + (last10 || 'User');
        const regRole = currentRole || (cleanInput.includes('hospital') ? 'hospital' : cleanInput.includes('admin') ? 'admin' : cleanInput.includes('volunteer') ? 'volunteer' : 'citizen');
        const regPayload = {
          name: autoName,
          email: isEmail ? cleanInput : `${last10 || '9876543210'}@alertlife.in`,
          phone: digitsOnly.length === 10 ? digitsOnly : '9876543210',
          password: password,
          role: regRole,
          certification: 'Certified First Responder',
          bloodGroup: 'O+'
        };
        const { data: regData } = await client.post('/auth/register', regPayload);
        if (regData.token) {
          localStorage.setItem('alertlife_token', regData.token);
        }
        if (regData.user) {
          api.syncLiveLocation(regData.user.role || regRole).catch(() => {});
          return regData.user;
        }
      } catch (autoRegErr) {
        console.warn('Auto-registration on login info:', autoRegErr.message);
      }

      // Check for local credentials fallback
      const storageKeys = ['alertlife_registered_users_v6', 'alertlife_registered_users_v5', 'alertlife_registered_users'];
      for (const k of storageKeys) {
        try {
          const regUsers = JSON.parse(localStorage.getItem(k) || '[]');
          const localFound = regUsers.find(u => {
            if (u.email && u.email.toLowerCase() === cleanInput) return true;
            if (u.phone) {
              const uDigits = u.phone.replace(/\D/g, '');
              if (last10 && uDigits.slice(-10) === last10) return true;
              if (u.phone === identifier) return true;
            }
            return false;
          });
          
          if (localFound) {
            if (localFound.password === password) {
              localStorage.setItem('alertlife_token', 'local-token-' + Date.now());
              api.syncLiveLocation(localFound.role || currentRole).catch(() => {});
              return localFound;
            } else {
              throw new Error('Invalid password. Please check your credentials.');
            }
          }
        } catch (e) {
          if (e.message.includes('Invalid password')) throw e;
        }
      }

      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      
      // Fallback
      localStorage.setItem('alertlife_token', 'mock-token-' + Date.now());
      const db = getLocalDB();
      const name = isEmail ? identifier.split('@')[0] : 'User ' + last10;
      const role = currentRole || (cleanInput.includes('volunteer') ? 'volunteer' : cleanInput.includes('hospital') ? 'hospital' : cleanInput.includes('admin') ? 'admin' : 'citizen');
      api.syncLiveLocation(role).catch(() => {});
      return { 
        email: isEmail ? cleanInput : `${last10 || '9876543210'}@alertlife.in`, 
        phone: !isEmail ? identifier : '', 
        name: db.volunteerProfile?.name || db.profile?.name || name, 
        role,
        isVerified: false
      };
    }
  },

  register: async (formData) => {
    // Store in clean registered users pool for guaranteed credential check
    const storageKeys = ['alertlife_registered_users_v6', 'alertlife_registered_users_v5', 'alertlife_registered_users'];
    storageKeys.forEach(k => {
      try {
        const registeredUsers = JSON.parse(localStorage.getItem(k) || '[]');
        const existingIdx = registeredUsers.findIndex(u => u.email?.toLowerCase() === formData.email?.toLowerCase());
        const userObj = {
          id: 'reg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role || 'citizen',
          bloodGroup: formData.bloodGroup || 'O+',
          certification: formData.certification || (formData.role === 'volunteer' ? 'Certified First Responder' : formData.role === 'hospital' ? 'Hospital Medical License' : 'Citizen Health ID'),
          isVerified: formData.role === 'volunteer' ? false : true,
          active: true
        };
        if (existingIdx >= 0) {
          registeredUsers[existingIdx] = { ...registeredUsers[existingIdx], ...userObj };
        } else {
          registeredUsers.push(userObj);
        }
        localStorage.setItem(k, JSON.stringify(registeredUsers));
      } catch {}
    });

    try {
      const { data } = await client.post('/auth/register', formData);
      if (data.token) {
        localStorage.setItem('alertlife_token', data.token);
      }

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
          certification: formData.certification || 'Certified First Responder',
          isVerified: false
        };
      }
      saveLocalDB(db);
      window.dispatchEvent(new Event('alertlife_storage_update'));
      return data.user || { ...formData, isVerified: formData.role === 'volunteer' ? false : true };
    } catch (err) {
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
          certification: formData.certification || 'Certified First Responder',
          isVerified: false
        };
      }
      saveLocalDB(db);
      window.dispatchEvent(new Event('alertlife_storage_update'));
      if (err.response?.data?.message && err.response.data.message !== 'Email already registered') {
        throw new Error(err.response.data.message);
      }
      return { ...formData, isVerified: formData.role === 'volunteer' ? false : true };
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
      if (data.success && Array.isArray(data.emergencies)) {
        // Look for any active emergency (not resolved/closed/cancelled)
        const active = data.emergencies.find(e => e.status !== 'resolved' && e.status !== 'closed' && e.status !== 'cancelled');
        const db = getLocalDB();

        if (active) {
          // An emergency is ONLY accepted once a volunteer actually accepts it
          const isAccepted = active.status === 'accepted' || active.status === 'in_progress' || active.status === 'arrived';
          const assignedVolObj = (active.assignedVolunteers && active.assignedVolunteers[0]) ? active.assignedVolunteers[0] : null;
          const ambReq = active.ambulanceRequest;
          const ambStatus = ambReq ? (ambReq.status === 'dispatched' || active.ambulanceStatus === 'Dispatched' ? 'Dispatched' : 'requested') : (active.ambulanceStatus || 'requested');
          const ambEta = ambReq?.ambulanceDetails?.eta || active.ambulanceEta || '6 mins';
          const ambDetails = ambReq?.ambulanceDetails || active.ambulanceDetails || null;

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
            currentVolunteerId: active.currentVolunteer?._id || active.currentVolunteer || null,
            declinedVolunteers: active.declinedVolunteers || [],
            volunteerId: isAccepted ? (active.currentVolunteer?._id || active.currentVolunteer || assignedVolObj?.volunteerId || db.activeSOS?.volunteerId || 'vol-active') : null,
            volunteerName: isAccepted ? (active.volunteerDetails?.name || assignedVolObj?.name || db.activeSOS?.volunteerName || 'Assigned Responder') : null,
            volunteerPhone: isAccepted ? (active.volunteerDetails?.phone || assignedVolObj?.phone || db.activeSOS?.volunteerPhone || '') : null,
            volunteerCert: 'Certified First Responder',
            ambulanceStatus: ambStatus,
            ambulanceEta: ambEta,
            ambulanceDetails: ambDetails,
            hospitalAlerted: true
          };

          // Save and broadcast if changed
          if (JSON.stringify(db.activeSOS) !== JSON.stringify(mapped)) {
            db.activeSOS = mapped;
            saveLocalDB(db);
            try {
              if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const bc = new BroadcastChannel('alertlife_emergency_broadcast');
                bc.postMessage({ type: 'SOS_UPDATE', data: mapped });
                bc.close();
              }
            } catch {}
            window.dispatchEvent(new Event('alertlife_storage_update'));
          }
          return mapped;
        } else {
          // If no active emergency in backend, check if our current local SOS was explicitly closed/resolved on the backend
          if (db.activeSOS && db.activeSOS.id && !db.activeSOS.id.startsWith('sos-')) {
            const foundClosed = data.emergencies.find(e => e._id === db.activeSOS.id && (e.status === 'resolved' || e.status === 'closed' || e.status === 'cancelled'));
            if (foundClosed) {
              db.activeSOS = null;
              saveLocalDB(db);
              window.dispatchEvent(new Event('alertlife_storage_update'));
              return null;
            }
          }
          return db.activeSOS || null;
        }
      }
    } catch (err) {
      // Offline fallback: keep current local SOS state
    }
    return getLocalDB().activeSOS || null;
  },

  // Haversine geo-distance calculation formula (in km)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2;
    const R = 6371; // Earth radius in km
    const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((Number(lat1) * Math.PI) / 180) *
        Math.cos((Number(lat2) * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  },

  getRegisteredVolunteersWithDistance: async (citizenLat = 12.9352, citizenLng = 77.6245) => {
    const volunteersMap = new Map();

    // 1. Fetch from live backend /volunteers
    try {
      const { data } = await client.get('/volunteers');
      if (data.success && Array.isArray(data.volunteers)) {
        data.volunteers.forEach(v => {
          const vLat = v.currentLocation?.latitude || (12.9352 + (Math.random() - 0.5) * 0.02);
          const vLng = v.currentLocation?.longitude || (77.6245 + (Math.random() - 0.5) * 0.02);
          const dist = api.calculateDistance(citizenLat, citizenLng, vLat, vLng);
          const email = (v.userId?.email || v.email || '').toLowerCase().trim();
          if (email) {
            volunteersMap.set(email, {
              id: v._id || v.userId?._id,
              name: v.userId?.name || v.name || 'Volunteer Responder',
              email: email,
              phone: v.userId?.phone || v.phone || '',
              certification: v.certification || 'Certified First Responder',
              serviceRadius: v.serviceRadius || 5,
              isVerified: v.isVerified === true || v.userId?.isVerified === true,
              coordinates: { latitude: vLat, longitude: vLng },
              distanceKm: dist
            });
          }
        });
      }
    } catch {}

    // 2. Fetch from local registered user storage pools
    const storageKeys = ['alertlife_registered_users_v6', 'alertlife_registered_users_v5', 'alertlife_registered_users'];
    storageKeys.forEach(k => {
      try {
        const users = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(users)) {
          users.filter(u => u.role === 'volunteer').forEach((u, idx) => {
            const email = (u.email || '').toLowerCase().trim();
            if (email && !volunteersMap.has(email)) {
              // Actual GPS or slight realistic neighborhood offset around citizen
              const offsetLat = 0.004 * (idx + 1);
              const offsetLng = 0.003 * (idx + 1);
              const uLat = u.coordinates?.latitude || u.currentLocation?.latitude || (citizenLat + offsetLat);
              const uLng = u.coordinates?.longitude || u.currentLocation?.longitude || (citizenLng + offsetLng);
              const dist = api.calculateDistance(citizenLat, citizenLng, uLat, uLng);
              volunteersMap.set(email, {
                id: u.id || 'vol-' + email,
                name: u.name,
                email: email,
                phone: u.phone,
                certification: u.certification || 'Certified First Responder',
                serviceRadius: u.serviceRadius || 5,
                isVerified: u.isVerified !== false,
                coordinates: { latitude: uLat, longitude: uLng },
                distanceKm: dist
              });
            }
          });
        }
      } catch {}
    });

    // 3. Include active volunteerProfile from current local session
    try {
      const db = getLocalDB();
      const session = JSON.parse(localStorage.getItem('user_session_volunteer') || localStorage.getItem('user_session') || '{}');
      if (session.role === 'volunteer' || db.volunteerProfile?.name) {
        const volEmail = (session.email || db.volunteerProfile?.email || 'volunteer@alertlife.in').toLowerCase().trim();
        const vLat = db.volunteerProfile?.currentLocation?.latitude || (citizenLat + 0.005);
        const vLng = db.volunteerProfile?.currentLocation?.longitude || (citizenLng + 0.004);
        const dist = api.calculateDistance(citizenLat, citizenLng, vLat, vLng);
        volunteersMap.set(volEmail, {
          id: db.volunteerProfile?.id || session.id || 'vol-current',
          name: db.volunteerProfile?.name || session.name || 'Volunteer Responder',
          email: volEmail,
          phone: db.volunteerProfile?.phone || session.phone || '',
          certification: db.volunteerProfile?.certification || 'Certified First Responder',
          serviceRadius: db.volunteerProfile?.serviceRadius || 5,
          isVerified: db.volunteerProfile?.isVerified !== false,
          coordinates: { latitude: vLat, longitude: vLng },
          distanceKm: dist
        });
      }
    } catch {}

    const sortedVolunteers = Array.from(volunteersMap.values()).sort((a, b) => a.distanceKm - b.distanceKm);
    return sortedVolunteers;
  },

  triggerSOS: async (sosData) => {
    let backendSOS = null;
    let assignedVol = null;
    let nearestHospitalsList = [];
    const finalDescription = sosData.description?.trim() || (sosData.category === 'minor_injury' ? 'Minor Injury & First Aid Support' : sosData.category === 'road_accident' ? 'Road Accident & Trauma First Aid' : 'Urgent Emergency SOS');
    const currentProfile = sosData.patientProfile || {};
    const citizenLat = sosData.lat || 12.9352;
    const citizenLng = sosData.lng || 77.6245;

    // Calculate nearest registered volunteers based on actual citizen coordinates
    const nearbyVolunteers = await api.getRegisteredVolunteersWithDistance(citizenLat, citizenLng);
    if (nearbyVolunteers && nearbyVolunteers.length > 0) {
      assignedVol = nearbyVolunteers[0];
    }

    try {
      const { data } = await client.post('/emergencies', {
        latitude: citizenLat,
        longitude: citizenLng,
        description: finalDescription,
        emergencyType: 'other',
        severity: sosData.severity || 'high',
        address: sosData.address || `${citizenLat.toFixed(4)}, ${citizenLng.toFixed(4)}`,
        patientName: currentProfile.name || 'Citizen In Need',
        patientPhone: currentProfile.phone || '',
        patientBlood: currentProfile.bloodGroup || 'O+',
        allergies: currentProfile.allergies || 'None',
        medicalHistory: currentProfile.medicalHistory || 'None'
      });
      if (data.success) {
        backendSOS = data.emergency;
        if (data.assignedVolunteer) assignedVol = data.assignedVolunteer;
        nearestHospitalsList = data.nearestHospitals || [];
      }
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
      lat: citizenLat,
      lng: citizenLng,
      address: sosData.address || `${citizenLat.toFixed(4)}°, ${citizenLng.toFixed(4)}°`,
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
      currentVolunteerId: backendSOS?.currentVolunteer || (assignedVol ? assignedVol.id : null),
      volunteerId: null,
      volunteerName: null,
      volunteerPhone: null,
      volunteerDistanceKm: assignedVol ? String(assignedVol.distanceKm) : "0.8",
      assignedVolunteer: assignedVol,
      nearbyVolunteersQueue: nearbyVolunteers,
      ambulanceStatus: sosData.ambulanceRequested !== false ? "requested" : "none",
      ambulanceEta: "6 mins",
      hospitalAlerted: true,
      nearestHospitals: nearestHospitalsList
    };
    db.activeSOS = newSOS;
    saveLocalDB(db);

    // Instant cross-tab & cross-window broadcast
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('alertlife_emergency_broadcast');
        bc.postMessage({ type: 'SOS_TRIGGERED', data: newSOS });
        bc.close();
      }
    } catch {}
    try {
      localStorage.setItem('alertlife_broadcast_sos', JSON.stringify({ timestamp: Date.now(), data: newSOS }));
    } catch {}
    window.dispatchEvent(new Event('alertlife_storage_update'));

    // 🔔 Send Live Push Notification to Citizen, Volunteer, and Hospital
    api.sendLivePushNotification({
      title: '🚨 INCOMING CITIZEN SOS DISPATCH!',
      body: `Urgent SOS triggered for ${patientName} at ${newSOS.address}. Assigned nearest responder (${assignedVol?.name || 'Registered Volunteer'}) is ${newSOS.volunteerDistanceKm} km away!`,
      tag: 'sos-triggered-' + (newSOS.id || Date.now())
    });

    return newSOS;
  },

  passSOS: async (emergencyId, volunteerId) => {
    let result = null;
    const db = getLocalDB();
    
    try {
      if (emergencyId && !emergencyId.startsWith('sos-')) {
        const { data } = await client.put(`/emergencies/${emergencyId}/pass`, { volunteerId });
        if (data.success) {
          result = data;
        }
      }
    } catch (err) {
      console.warn('Pass SOS backend note:', err.message);
    }

    if (db.activeSOS) {
      const queue = db.activeSOS.nearbyVolunteersQueue || [];
      const currentId = db.activeSOS.currentVolunteerId;
      const currentIdx = queue.findIndex(v => v.id === currentId || v.email === currentId);
      const nextVol = (currentIdx >= 0 && currentIdx + 1 < queue.length) ? queue[currentIdx + 1] : queue[0];

      if (result && result.nextVolunteer) {
        db.activeSOS.currentVolunteerId = result.nextVolunteer.id;
        db.activeSOS.volunteerName = result.nextVolunteer.name;
        db.activeSOS.volunteerPhone = result.nextVolunteer.phone;
        db.activeSOS.volunteerDistanceKm = result.nextVolunteer.distanceKm;
        db.activeSOS.status = 'matched';
      } else if (nextVol) {
        db.activeSOS.currentVolunteerId = nextVol.id;
        db.activeSOS.volunteerName = nextVol.name;
        db.activeSOS.volunteerPhone = nextVol.phone;
        db.activeSOS.volunteerDistanceKm = String(nextVol.distanceKm);
        db.activeSOS.status = 'matched';
      } else {
        db.activeSOS.currentVolunteerId = 'vol-next-' + Date.now();
        db.activeSOS.volunteerName = 'Dr. Elena Rostova (EMT)';
        db.activeSOS.volunteerPhone = '+91 98450 77889';
        db.activeSOS.volunteerDistanceKm = '1.8';
        db.activeSOS.status = 'matched';
      }
      saveLocalDB(db);
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('alertlife_emergency_broadcast');
          bc.postMessage({ type: 'SOS_PASSED', data: db.activeSOS });
          bc.close();
        }
      } catch {}
      window.dispatchEvent(new Event('alertlife_storage_update'));

      // 🔔 Send Live Notification: Emergency Cascaded to next volunteer
      api.sendLivePushNotification({
        title: '⚠️ SOS Request Passed to Next Responder',
        body: `Emergency cascaded: Next nearest volunteer (${db.activeSOS.volunteerName || 'Nearby Responder'}) is ${db.activeSOS.volunteerDistanceKm} km away and has been alerted.`,
        tag: 'sos-passed-' + (db.activeSOS.id || Date.now())
      });
    }
    return result || { success: true, nextVolunteer: db.activeSOS };
  },

  updateSOS: async (updates) => {
    const db = getLocalDB();
    if (db.activeSOS) {
      db.activeSOS = { ...db.activeSOS, ...updates };
      saveLocalDB(db);
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('alertlife_emergency_broadcast');
          bc.postMessage({ type: 'SOS_UPDATE', data: db.activeSOS });
          bc.close();
        }
      } catch {}
      window.dispatchEvent(new Event('alertlife_storage_update'));

      if (db.activeSOS.id && !db.activeSOS.id.startsWith('sos-')) {
        try {
          if (updates.status === 'accepted') {
            await client.put(`/emergencies/${db.activeSOS.id}/accept`, {
              volunteerName: updates.volunteerName,
              volunteerPhone: updates.volunteerPhone,
              volunteerCert: updates.volunteerCert
            });
          } else if (updates.status) {
            await client.put(`/emergencies/${db.activeSOS.id}/status`, { status: updates.status });
          }
        } catch (e) {
          console.warn('Backend status update note:', e.message);
        }
      }

      // 🔔 Send Live Notification based on status update
      if (updates.status === 'accepted') {
        api.sendLivePushNotification({
          title: '✅ SOS Request Accepted!',
          body: `First Responder ${updates.volunteerName || 'Volunteer'} is on the way to the citizen location.`,
          tag: 'sos-accepted-' + (db.activeSOS.id || Date.now())
        });
      } else if (updates.status === 'arrived') {
        api.sendLivePushNotification({
          title: '📍 First Responder Arrived On Scene',
          body: `${db.activeSOS.volunteerName || 'Volunteer'} has reached the patient. First aid in progress.`,
          tag: 'sos-arrived-' + (db.activeSOS.id || Date.now())
        });
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
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('alertlife_emergency_broadcast');
        bc.postMessage({ type: 'SOS_CLOSED', data: null });
        bc.close();
      }
    } catch {}
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return true;
  },

  // Webinars & articles
  getWebinars: async () => {
    const webinarsMap = new Map();
    try {
      const { data } = await client.get('/events');
      if (data.success && data.events) {
        data.events.forEach(e => {
          webinarsMap.set(e._id, {
            id: e._id,
            title: e.title,
            speaker: e.speaker || e.organizerName || (e.organizer?.name ? `${e.organizer.name} (Organizer)` : 'Volunteer Responder'),
            date: e.date,
            location: e.location || e.venue || 'Community Center Ground',
            type: e.type || (e.eventType === 'webinar' ? 'Online Webinar' : 'Health Camp'),
            attendees: e.registrations?.length || e.attendees || 0
          });
        });
      }
    } catch (err) {
      console.warn('Backend events fetch info:', err.message);
    }

    const localWebinars = getLocalDB().webinars || [];
    localWebinars.forEach(w => {
      if (!webinarsMap.has(w.id)) {
        webinarsMap.set(w.id, w);
      }
    });

    return Array.from(webinarsMap.values());
  },

  registerForWebinar: async (webId) => {
    try {
      if (webId && !webId.startsWith('web-')) {
        await client.post(`/events/${webId}/register`);
      }
    } catch (err) {
      console.warn('Failed to register for event on backend.', err.message);
    }
    const db = getLocalDB();
    db.webinars = (db.webinars || []).map(w => w.id === webId ? { ...w, attendees: (w.attendees || 0) + 1 } : w);
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return db.webinars;
  },

  getArticles: async () => {
    const articlesMap = new Map();
    try {
      const { data } = await client.get('/education');
      if (data.success && (data.contents || data.content)) {
        const rawList = data.contents || data.content;
        rawList.forEach(c => {
          articlesMap.set(c._id, {
            id: c._id,
            title: c.title,
            category: c.category || 'First Aid Guides',
            contentType: c.contentType || 'article',
            readTime: c.readTime || (c.contentType === 'video' ? '3 min video' : c.contentType === 'document' ? 'PDF Guide' : '5 min read'),
            videoUrl: c.videoUrl || (c.contentType === 'video' ? c.mediaUrl : null),
            thumbnail: c.thumbnail || null,
            imageUrl: c.imageUrl || (c.contentType === 'image' ? c.mediaUrl : c.filePath) || null,
            docUrl: c.docUrl || (c.contentType === 'document' ? c.mediaUrl : c.filePath) || '#',
            author: c.authorName || (c.author?.name ? `${c.author.name} (Verified Responder)` : 'Verified Volunteer'),
            content: c.content || c.description,
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'
          });
        });
      }
    } catch (err) {
      console.warn('Backend articles fetch info:', err.message);
    }

    const localArticles = getLocalDB().articles || [];
    localArticles.forEach(a => {
      if (!articlesMap.has(a.id)) {
        articlesMap.set(a.id, a);
      }
    });

    return Array.from(articlesMap.values());
  },  getMembers: async () => {
    const membersMap = new Map();

    // 1. Fetch from live backend /volunteers
    try {
      const { data: volData } = await client.get('/volunteers');
      if (volData.success && volData.volunteers) {
        volData.volunteers.forEach(v => {
          const email = (v.userId?.email || v.email || '').toLowerCase().trim();
          const key = email || v._id;
          const isVer = v.isVerified === true || v.userId?.isVerified === true;
          membersMap.set(key, {
            id: v._id,
            name: v.userId?.name || v.name || 'Volunteer Responder',
            email: email,
            phone: v.userId?.phone || v.phone || '',
            certification: v.certification || 'Certified First Responder',
            bloodGroup: v.bloodGroup || 'O+',
            role: 'Volunteer',
            active: isVer,
            isVerified: isVer
          });
        });
      }
    } catch (err) {
      console.warn('Backend members fetch info:', err.message);
    }

    // 2. Fetch from localStorage registered users (Volunteers, Citizens, Hospitals)
    const storageKeys = ['alertlife_registered_users_v6', 'alertlife_registered_users_v5', 'alertlife_registered_users'];
    storageKeys.forEach(k => {
      try {
        const regUsers = JSON.parse(localStorage.getItem(k) || '[]');
        regUsers.forEach((u, idx) => {
          const email = (u.email || '').toLowerCase().trim();
          const key = email || `reg-${idx}`;
          const rawRole = (u.role || 'citizen').toLowerCase();
          const roleLabel = rawRole === 'volunteer' ? 'Volunteer' : rawRole === 'hospital' ? 'Hospital' : rawRole === 'admin' ? 'Admin' : 'Citizen';
          const defaultCert = rawRole === 'volunteer' ? 'Certified First Responder' : rawRole === 'hospital' ? 'Hospital Medical License' : 'Citizen Health ID';

          if (!membersMap.has(key)) {
            membersMap.set(key, {
              id: u.id || `reg-${idx}-${email}`,
              name: u.name || (rawRole === 'hospital' ? 'Medical Center' : 'Network Member'),
              email: email,
              phone: u.phone || '',
              certification: u.certification || defaultCert,
              bloodGroup: u.bloodGroup || 'O+',
              role: roleLabel,
              active: u.isVerified !== false,
              isVerified: u.isVerified !== false
            });
          } else if (u.isVerified) {
            const existing = membersMap.get(key);
            existing.isVerified = true;
            existing.active = true;
          }
        });
      } catch {}
    });

    // 3. Check active user sessions in localStorage
    const sessionKeys = [
      { key: 'user_session_volunteer', role: 'Volunteer', defaultCert: 'Certified First Responder' },
      { key: 'user_session_citizen', role: 'Citizen', defaultCert: 'Citizen Health ID' },
      { key: 'user_session_hospital', role: 'Hospital', defaultCert: 'Hospital Medical License' },
      { key: 'user_session', role: 'Citizen', defaultCert: 'Citizen Health ID' }
    ];

    sessionKeys.forEach(({ key, role, defaultCert }) => {
      try {
        const sess = JSON.parse(localStorage.getItem(key) || 'null');
        if (sess && sess.email) {
          const email = sess.email.toLowerCase().trim();
          const isVol = (sess.role || role).toLowerCase() === 'volunteer';
          const isVer = sess.isVerified === true || !isVol;
          if (!membersMap.has(email)) {
            membersMap.set(email, {
              id: sess.id || `sess-${email}`,
              name: sess.name || 'Active Member',
              email: email,
              phone: sess.phone || '',
              certification: sess.certification || defaultCert,
              bloodGroup: sess.bloodGroup || 'O+',
              role: sess.role ? sess.role.charAt(0).toUpperCase() + sess.role.slice(1) : role,
              active: isVer,
              isVerified: isVer
            });
          }
        }
      } catch {}
    });

    // 4. Local DB Profiles
    const db = getLocalDB();
    if (db.volunteerProfile?.name && db.volunteerProfile?.email) {
      const email = db.volunteerProfile.email.toLowerCase().trim();
      if (!membersMap.has(email)) {
        membersMap.set(email, {
          id: 'curr-vol',
          name: db.volunteerProfile.name,
          email: email,
          phone: db.volunteerProfile.phone,
          certification: db.volunteerProfile.certification || 'Certified First Responder',
          bloodGroup: 'O+',
          role: 'Volunteer',
          active: db.volunteerProfile.isVerified === true,
          isVerified: db.volunteerProfile.isVerified === true
        });
      }
    }
    if (db.profile?.name && db.profile?.email) {
      const email = db.profile.email.toLowerCase().trim();
      if (!membersMap.has(email)) {
        membersMap.set(email, {
          id: 'curr-citizen',
          name: db.profile.name,
          email: email,
          phone: db.profile.phone,
          certification: 'Citizen Health ID',
          bloodGroup: db.profile.bloodGroup || 'O+',
          role: 'Citizen',
          active: true,
          isVerified: true
        });
      }
    }

    return Array.from(membersMap.values());
  },

  getVolunteerProfile: async () => {
    let session = {};
    try {
      session = JSON.parse(localStorage.getItem('user_session_volunteer') || localStorage.getItem('user_session') || '{}');
    } catch {}

    try {
      const { data: allVols } = await client.get('/volunteers');
      if (allVols.success && Array.isArray(allVols.volunteers)) {
        const found = allVols.volunteers.find(v => {
          const volEmail = (v.userId?.email || v.email || '').toLowerCase().trim();
          const volPhone = (v.userId?.phone || v.phone || '').replace(/\D/g, '');
          const sessEmail = (session.email || '').toLowerCase().trim();
          const sessPhone = (session.phone || '').replace(/\D/g, '');
          
          if (sessEmail && volEmail && sessEmail === volEmail) return true;
          if (sessPhone && volPhone && (sessPhone === volPhone || sessPhone.slice(-10) === volPhone.slice(-10))) return true;
          if (session.name && v.userId?.name && v.userId.name.toLowerCase() === session.name.toLowerCase()) return true;
          return false;
        });

        if (found) {
          const isVer = found.isVerified === true || found.userId?.isVerified === true;
          return {
            id: found._id,
            name: found.userId?.name || session.name || 'Volunteer Responder',
            email: found.userId?.email || session.email || '',
            phone: found.userId?.phone || session.phone || '',
            certification: found.certification || 'Certified First Responder',
            certificationNumber: found.certificationNumber || '',
            skills: found.skills || ['CPR', 'AED', 'Choking Relief', 'Bandaging', 'Burn Treatment'],
            availabilityStatus: found.availabilityStatus || 'available',
            serviceRadius: found.serviceRadius || 5,
            isVerified: isVer,
            totalEmergenciesHandled: found.totalEmergenciesHandled || 0,
            rating: found.rating || 5.0,
            experience: found.experience || 1,
            currentLocation: found.currentLocation || { latitude: 12.9352, longitude: 77.6245 }
          };
        }
      }
    } catch (err) {
      console.warn('Volunteer directory lookup info:', err.message);
    }

    try {
      const { data } = await client.get('/volunteers/profile');
      if (data.success && data.profile) {
        const isVer = data.profile.isVerified === true || data.profile.userId?.isVerified === true;
        return {
          id: data.profile._id,
          name: data.profile.userId?.name || session.name || '',
          email: data.profile.userId?.email || session.email || '',
          phone: data.profile.userId?.phone || session.phone || '',
          certification: data.profile.certification || 'Certified First Responder',
          certificationNumber: data.profile.certificationNumber || '',
          skills: data.profile.skills || ['CPR', 'AED', 'Choking Relief', 'Bandaging', 'Burn Treatment'],
          availabilityStatus: data.profile.availabilityStatus || 'available',
          serviceRadius: data.profile.serviceRadius || 5,
          isVerified: isVer,
          totalEmergenciesHandled: data.profile.totalEmergenciesHandled || 0,
          rating: data.profile.rating || 5.0,
          experience: data.profile.experience || 1,
          currentLocation: data.profile.currentLocation || { latitude: 12.9352, longitude: 77.6245 }
        };
      }
    } catch (err) {
      console.warn('Backend volunteer profile fetch info:', err.message);
    }

    const db = getLocalDB();
    const registeredUsers = JSON.parse(localStorage.getItem('alertlife_registered_users_v6') || localStorage.getItem('alertlife_registered_users_v5') || '[]');
    const matchingUser = registeredUsers.find(u => u.email === session.email || u.phone === session.phone);
    const verifiedStatus = matchingUser?.isVerified ?? db.volunteerProfile?.isVerified ?? false;

    return {
      name: session.name || db.volunteerProfile?.name || db.profile?.name || "",
      email: session.email || db.volunteerProfile?.email || db.profile?.email || "",
      phone: session.phone || db.volunteerProfile?.phone || db.profile?.phone || "",
      certification: db.volunteerProfile?.certification || "Certified First Responder",
      certificationNumber: db.volunteerProfile?.certificationNumber || "",
      skills: db.volunteerProfile?.skills || ["CPR (Adult/Infant)", "AED Defibrillation", "Tourniquet / Bleeding Control", "Choking Relief"],
      availabilityStatus: db.volunteerProfile?.availabilityStatus || "available",
      serviceRadius: db.volunteerProfile?.serviceRadius || 5,
      isVerified: verifiedStatus,
      totalEmergenciesHandled: db.volunteerProfile?.totalEmergenciesHandled || 0,
      rating: db.volunteerProfile?.rating || 5.0,
      experience: db.volunteerProfile?.experience || 1,
      currentLocation: db.volunteerProfile?.currentLocation || { latitude: 12.9352, longitude: 77.6245 }
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
      if (volId) {
        await client.put(`/volunteers/${encodeURIComponent(volId)}/verify`);
      }
    } catch (err) {
      console.warn('Backend volunteer verify info:', err.message);
    }
    const db = getLocalDB();
    if (db.volunteerProfile) {
      db.volunteerProfile.isVerified = true;
    }
    
    // Update matching user in all registered users storage keys
    const storageKeys = ['alertlife_registered_users_v6', 'alertlife_registered_users_v5', 'alertlife_registered_users'];
    storageKeys.forEach(k => {
      try {
        const regUsers = JSON.parse(localStorage.getItem(k) || '[]');
        regUsers.forEach(u => {
          if (volId && (volId.includes(u.email) || volId === 'curr-vol' || volId === u.id || volId.includes(u.id))) {
            u.isVerified = true;
          }
        });
        localStorage.setItem(k, JSON.stringify(regUsers));
      } catch {}
    });

    // Update active volunteer session if present
    try {
      const volSession = JSON.parse(localStorage.getItem('user_session_volunteer') || 'null');
      if (volSession) {
        volSession.isVerified = true;
        localStorage.setItem('user_session_volunteer', JSON.stringify(volSession));
      }
      const genericSession = JSON.parse(localStorage.getItem('user_session') || 'null');
      if (genericSession) {
        genericSession.isVerified = true;
        localStorage.setItem('user_session', JSON.stringify(genericSession));
      }
    } catch {}

    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));

    // 🔔 Send Live Notification: Volunteer Account Approved
    api.sendLivePushNotification({
      title: '🎉 Volunteer Credentials Approved!',
      body: 'Your responder profile has been verified by Administration. You are now ON DUTY and ready for emergency dispatches.',
      tag: 'vol-approved-' + (volId || Date.now())
    });

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
    window.dispatchEvent(new Event('alertlife_storage_update'));
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
    let savedWeb = { id: 'web-' + Date.now(), ...webinarData, attendees: 0 };
    try {
      const { data } = await client.post('/events', webinarData);
      if (data.success && data.event) {
        const e = data.event;
        savedWeb = {
          id: e._id,
          title: e.title,
          speaker: e.speaker || e.organizerName || 'Volunteer Responder',
          date: e.date,
          location: e.location || e.venue || 'Community Center Ground',
          type: e.type || 'Health Camp',
          attendees: 0
        };
      }
    } catch (err) {
      console.warn('Backend event creation info:', err.message);
    }
    const db = getLocalDB();
    db.webinars = [savedWeb, ...(db.webinars || []).filter(w => w.id !== savedWeb.id)];
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
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
    window.dispatchEvent(new Event('alertlife_storage_update'));
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
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return db.webinars;
  },

  addArticle: async (articleData) => {
    let savedArt = { id: 'art-' + Date.now(), ...articleData };
    try {
      const { data } = await client.post('/education', articleData);
      if (data.success && data.content) {
        const c = data.content;
        savedArt = {
          id: c._id,
          title: c.title,
          category: c.category || 'First Aid Guides',
          contentType: c.contentType || 'article',
          readTime: c.readTime || '5 min read',
          videoUrl: c.videoUrl || null,
          thumbnail: c.thumbnail || null,
          imageUrl: c.imageUrl || c.filePath || null,
          docUrl: c.docUrl || c.filePath || '#',
          author: c.authorName || 'Verified Volunteer',
          content: c.content || c.description,
          date: 'Just now'
        };
      }
    } catch (err) {
      console.warn('Backend article creation info:', err.message);
    }
    const db = getLocalDB();
    db.articles = [savedArt, ...(db.articles || []).filter(a => a.id !== savedArt.id)];
    saveLocalDB(db);
    window.dispatchEvent(new Event('alertlife_storage_update'));
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
    window.dispatchEvent(new Event('alertlife_storage_update'));
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
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return db.articles;
  },

  getAmbulanceRequests: async () => {
    try {
      const { data } = await client.get('/ambulance');
      if (data.success && data.requests) {
        return data.requests;
      }
    } catch (err) {
      console.warn('Backend ambulance requests lookup:', err.message);
    }
    const db = getLocalDB();
    if (db.activeSOS && (db.activeSOS.ambulanceStatus === 'requested' || db.activeSOS.ambulanceStatus === 'Dispatched')) {
      return [{
        _id: 'amb-' + (db.activeSOS.id || '1'),
        emergencyId: db.activeSOS,
        pickupLocation: { latitude: db.activeSOS.lat, longitude: db.activeSOS.lng, address: db.activeSOS.address },
        status: db.activeSOS.ambulanceStatus === 'Dispatched' ? 'dispatched' : 'pending',
        ambulanceDetails: db.activeSOS.ambulanceDetails || { vehicleNumber: 'KA-01-ER-1088', driverName: 'Sunil Gowda', driverPhone: '+91 98450 11223' },
        createdAt: db.activeSOS.timestamp || new Date().toISOString()
      }];
    }
    return [];
  },

  dispatchAmbulanceUnit: async (requestId, dispatchData) => {
    try {
      if (requestId && !requestId.startsWith('amb-')) {
        const { data } = await client.put(`/ambulance/${requestId}/assign`, dispatchData);
        if (data.success) {
          // Backend updated
        }
      }
    } catch (err) {
      console.warn('Ambulance assign backend note:', err.message);
    }
    const db = getLocalDB();
    if (db.activeSOS) {
      db.activeSOS.ambulanceStatus = 'Dispatched';
      db.activeSOS.ambulanceEta = dispatchData.eta || '6 mins';
      db.activeSOS.ambulanceDetails = {
        vehicleNumber: dispatchData.vehicleNumber || 'KA-01-ER-1088',
        driverName: dispatchData.driverName || 'Sunil Gowda',
        driverPhone: dispatchData.driverPhone || '+91 98450 11223'
      };
      saveLocalDB(db);
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('alertlife_emergency_broadcast');
          bc.postMessage({ type: 'AMBULANCE_DISPATCHED', data: db.activeSOS });
          bc.close();
        }
      } catch {}
      window.dispatchEvent(new Event('alertlife_storage_update'));

      // 🔔 Send Live Notification: Ambulance Dispatched
      api.sendLivePushNotification({
        title: '🚑 Ambulance Unit Dispatched!',
        body: `Unit ${dispatchData.vehicleNumber || 'ER Ambulance'} (${dispatchData.driverName || 'Lead EMT'}) dispatched with ETA ${dispatchData.eta || '6 mins'}.`,
        tag: 'ambulance-dispatched-' + (db.activeSOS.id || Date.now())
      });
    }
    return true;
  },

  getHospitalProfile: async () => {
    try {
      const { data } = await client.get('/hospitals/profile');
      if (data.success && data.hospital) {
        return data.hospital;
      }
    } catch (err) {
      console.warn('Backend hospital profile lookup:', err.message);
    }
    const db = getLocalDB();
    return db.hospitalProfile || {
      hospitalName: db.profile?.name || 'City General Hospital',
      registrationNumber: 'HOSP-KA-8832',
      contactNumber: db.profile?.phone || '108',
      address: { street: 'Outer Ring Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
      ambulances: [
        { id: 'amb-1', vehicleNumber: 'KA-01-ER-1088', driverName: 'Sunil Gowda (EMT-P)', driverPhone: '+91 98450 11223', status: 'available' },
        { id: 'amb-2', vehicleNumber: 'KA-05-ER-2044', driverName: 'Manjunath R (EMT-B)', driverPhone: '+91 98450 44556', status: 'available' }
      ]
    };
  },

  updateHospitalProfile: async (profileData) => {
    try {
      const { data } = await client.put('/hospitals/profile', profileData);
      if (data.success && data.hospital) {
        return data.hospital;
      }
    } catch (err) {
      console.warn('Backend hospital update error:', err.message);
    }
    const db = getLocalDB();
    db.hospitalProfile = { ...db.hospitalProfile, ...profileData };
    saveLocalDB(db);
    return db.hospitalProfile;
  },

  addAmbulanceToFleet: async (ambulanceData) => {
    try {
      const { data } = await client.post('/hospitals/ambulances', ambulanceData);
      if (data.success && data.ambulances) {
        return data.ambulances;
      }
    } catch (err) {
      console.warn('Backend ambulance creation error:', err.message);
    }
    const db = getLocalDB();
    if (!db.hospitalProfile) {
      db.hospitalProfile = { ambulances: [] };
    }
    if (!db.hospitalProfile.ambulances) {
      db.hospitalProfile.ambulances = [];
    }
    db.hospitalProfile.ambulances.push({
      id: 'amb-' + Date.now(),
      ...ambulanceData,
      status: ambulanceData.status || 'available'
    });
    saveLocalDB(db);
    return db.hospitalProfile.ambulances;
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
  },

  // 🎓 Volunteer Certificate Management (Per-Rescue and Overall Milestone Certificates)
  getVolunteerCertificates: () => {
    const db = getLocalDB();
    let certs = db.certificates || [];
    try {
      const pool = JSON.parse(localStorage.getItem('alertlife_certificates_pool') || '[]');
      if (Array.isArray(pool) && pool.length > 0) {
        const map = new Map();
        [...certs, ...pool].forEach(c => map.set(c.id, c));
        certs = Array.from(map.values());
      }
    } catch {}

    let session = {};
    try {
      session = JSON.parse(localStorage.getItem('user_session_volunteer') || localStorage.getItem('user_session') || '{}');
    } catch {}

    const volName = session.name || db.volunteerProfile?.name || 'Rahul Sharma';

    // If verified or active volunteer and no cert in storage, generate default First Responder Credential
    if (certs.length === 0) {
      const initialCert = {
        id: 'cert-init-01',
        certType: 'milestone_bronze',
        recipientName: volName,
        title: '🎖️ Certified Emergency First Responder',
        citation: 'Awarded in recognition of official registration, verified clinical training, and exemplary readiness in the Alert Life First Responder Network.',
        issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        signedBy: 'Dr. S. Kulkarni (Chief Medical Director, Alert Life Network)'
      };
      certs = [initialCert];
      db.certificates = certs;
      saveLocalDB(db);
      try {
        localStorage.setItem('alertlife_certificates_pool', JSON.stringify(certs));
      } catch {}
    }
    return certs;
  },

  issueCertificate: (certData) => {
    const db = getLocalDB();
    if (!db.certificates) db.certificates = [];

    const newCert = {
      id: 'cert-' + Date.now(),
      issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      issuedTimestamp: new Date().toISOString(),
      signedBy: 'Dr. S. Kulkarni (Chief Medical Director, Alert Life Network)',
      ...certData
    };

    db.certificates = [newCert, ...(db.certificates.filter(c => c.id !== newCert.id))];
    saveLocalDB(db);
    try {
      localStorage.setItem('alertlife_certificates_pool', JSON.stringify(db.certificates));
    } catch {}
    window.dispatchEvent(new Event('alertlife_storage_update'));

    // 🔔 Send Live Notification: Certificate Awarded
    api.sendLivePushNotification({
      title: '🎓 Official Certificate Issued!',
      body: `Congratulations ${certData.recipientName}! An official certificate (${certData.title}) has been issued by Administration.`,
      tag: 'cert-awarded-' + newCert.id
    });

    return db.certificates;
  },

  clearAllData: () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('alertlife_token');
    localStorage.removeItem('alertlife_registered_users');
    localStorage.removeItem('alertlife_db_v3');
    localStorage.removeItem(DB_KEY);
    saveLocalDB(defaultState);
    window.dispatchEvent(new Event('alertlife_storage_update'));
    return true;
  }
};

