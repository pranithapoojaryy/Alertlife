const supabase = require('../config/supabase');

// Calculate distance using Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @desc Create emergency SOS request
// @route POST /api/emergencies
// @access Private (citizen) or Public fallback
const createEmergency = async (req, res) => {
  try {
    const {
      latitude, longitude, address, emergencyType, description, severity,
      patientName, patientPhone, patientBlood, allergies, medicalHistory
    } = req.body;

    const lat = Number(latitude || 12.9352);
    const lng = Number(longitude || 77.6245);
    const citizenId = req.user ? (req.user.id || req.user._id) : null;

    // 1. Insert emergency request into Supabase
    const { data: emergency, error: emError } = await supabase
      .from('emergency_requests')
      .insert({
        citizen_id: citizenId,
        patient_name: patientName || req.user?.name || 'Citizen In Need',
        patient_phone: patientPhone || req.user?.phone || '',
        patient_blood: patientBlood || 'O+',
        allergies: allergies || 'None declared',
        medical_history: medicalHistory || 'None declared',
        latitude: lat,
        longitude: lng,
        address: address || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        emergency_type: emergencyType || 'other',
        description: description || 'Medical Emergency Assistance Requested',
        severity: severity || 'high',
        status: 'pending'
      })
      .select()
      .single();

    if (emError || !emergency) {
      return res.status(500).json({ success: false, message: emError?.message || 'Failed to create emergency' });
    }

    emergency._id = emergency.id;

    // 2. Alert nearest hospital with ambulance auto-dispatch
    let topHospitals = [];
    try {
      const { data: hospitals } = await supabase
        .from('hospitals')
        .select('*');

      if (hospitals && hospitals.length > 0) {
        const sortedHospitals = hospitals.map(h => {
          const hLat = Number(h.latitude || 12.9352);
          const hLng = Number(h.longitude || 77.6245);
          const dist = getDistance(lat, lng, hLat, hLng);
          return { hospital: h, distance: dist };
        }).sort((a, b) => a.distance - b.distance);

        const nearestHospital = sortedHospitals[0]?.hospital;
        if (nearestHospital) {
          await supabase.from('ambulance_requests').insert({
            emergency_id: emergency.id,
            requested_by: citizenId,
            hospital_id: nearestHospital.id,
            status: 'requested',
            pickup_location: { latitude: lat, longitude: lng, address }
          });

          if (nearestHospital.user_id) {
            await supabase.from('notifications').insert({
              user_id: nearestHospital.user_id,
              title: '🚨 Emergency Ambulance Request!',
              message: `Auto-dispatched ambulance request for emergency (${(emergencyType || 'medical').replace('_', ' ')}). Location: ${address}`,
              type: 'ambulance',
              priority: 'high'
            });
          }
        }

        topHospitals = sortedHospitals.slice(0, 3).map(h => ({
          id: h.hospital.id,
          name: h.hospital.hospital_name || h.hospital.hospitalName || 'Emergency Center',
          phone: h.hospital.contact_number || h.hospital.contactNumber || '108',
          distance: h.distance.toFixed(2)
        }));
      }
    } catch (hospErr) {
      console.warn('Hospital auto-routing warning:', hospErr.message);
    }

    // 3. Find nearby available verified volunteers using coordinate filtering
    let primaryTarget = null;
    try {
      const { data: volunteers } = await supabase
        .from('volunteers')
        .select('*, user:users!user_id(id, name, phone)')
        .neq('availability_status', 'offline');

      if (volunteers && volunteers.length > 0) {
        const volunteersWithDist = volunteers
          .filter(v => v.user)
          .map(v => {
            const vLat = Number(v.latitude || lat);
            const vLng = Number(v.longitude || lng);
            const dist = getDistance(lat, lng, vLat, vLng);
            return { volunteer: v, distance: dist };
          })
          .sort((a, b) => a.distance - b.distance);

        primaryTarget = volunteersWithDist[0];

        if (primaryTarget) {
          const targetUserId = primaryTarget.volunteer.user.id;
          await supabase
            .from('emergency_requests')
            .update({ current_volunteer: targetUserId })
            .eq('id', emergency.id);

          await supabase.from('volunteer_assignments').insert({
            emergency_id: emergency.id,
            volunteer_id: targetUserId,
            distance_km: primaryTarget.distance.toFixed(2),
            status: 'notified'
          });

          await supabase.from('notifications').insert({
            user_id: targetUserId,
            title: '🚨 Urgent Nearby SOS Alert!',
            message: `Emergency SOS: ${(emergencyType || 'medical').replace('_', ' ')} is ${primaryTarget.distance.toFixed(1)} km from your live location. Respond now!`,
            type: 'emergency',
            priority: 'high'
          });
        }
      }
    } catch (volErr) {
      console.warn('Volunteer matching warning:', volErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Emergency created. Nearest volunteer dispatched (${primaryTarget ? primaryTarget.distance.toFixed(2) + ' km' : 'Searching'}). Hospital alerted.`,
      emergency,
      assignedVolunteer: primaryTarget ? {
        id: primaryTarget.volunteer.user.id,
        name: primaryTarget.volunteer.user.name,
        phone: primaryTarget.volunteer.user.phone,
        distanceKm: primaryTarget.distance.toFixed(2)
      } : null,
      nearestHospitals: topHospitals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all emergencies
// @route GET /api/emergencies
// @access Private or Public sync
const getEmergencies = async (req, res) => {
  try {
    let query = supabase
      .from('emergency_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.user && req.user.role === 'citizen' && req.query.self === 'true') {
      query = query.eq('citizen_id', req.user.id || req.user._id);
    }

    const { data: emergencies, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Normalize for frontend expectations
    const mapped = (emergencies || []).map(e => ({
      ...e,
      _id: e.id,
      patientName: e.patient_name || e.patientName,
      patientPhone: e.patient_phone || e.patientPhone,
      patientBlood: e.patient_blood || e.patientBlood,
      emergencyType: e.emergency_type || e.emergencyType,
      currentVolunteer: e.current_volunteer || e.currentVolunteer,
      location: { latitude: Number(e.latitude), longitude: Number(e.longitude), address: e.address }
    }));

    res.json({ success: true, count: mapped.length, emergencies: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get emergency by ID
// @route GET /api/emergencies/:id
// @access Private
const getEmergency = async (req, res) => {
  try {
    const { data: emergency, error } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    emergency._id = emergency.id;
    emergency.patientName = emergency.patient_name || emergency.patientName;
    emergency.patientPhone = emergency.patient_phone || emergency.patientPhone;
    emergency.patientBlood = emergency.patient_blood || emergency.patientBlood;
    emergency.location = { latitude: Number(emergency.latitude), longitude: Number(emergency.longitude), address: emergency.address };

    res.json({ success: true, emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update emergency status
// @route PUT /api/emergencies/:id/status
// @access Private
const updateEmergencyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: emergency, error } = await supabase
      .from('emergency_requests')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !emergency) {
      return res.status(404).json({ success: false, message: error?.message || 'Emergency not found' });
    }

    emergency._id = emergency.id;
    res.json({ success: true, message: 'Status updated', emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Accept emergency by volunteer
// @route PUT /api/emergencies/:id/accept
// @access Private
const acceptEmergency = async (req, res) => {
  try {
    const { volunteerName } = req.body;
    const volunteerId = req.user ? (req.user.id || req.user._id) : (req.body.volunteerId || null);

    const { data: emergency, error } = await supabase
      .from('emergency_requests')
      .update({
        status: 'assigned',
        current_volunteer: volunteerId
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !emergency) {
      return res.status(404).json({ success: false, message: error?.message || 'Emergency not found' });
    }

    emergency._id = emergency.id;

    if (volunteerId) {
      await supabase
        .from('volunteer_assignments')
        .upsert({
          emergency_id: req.params.id,
          volunteer_id: volunteerId,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        }, { onConflict: 'emergency_id,volunteer_id' });
    }

    res.json({ success: true, message: 'Emergency accepted', emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get volunteer's assigned emergencies
// @route GET /api/emergencies/volunteer/assigned
// @access Private (volunteer)
const getVolunteerEmergencies = async (req, res) => {
  try {
    const volunteerId = req.user.id || req.user._id;
    const { data: assignments, error } = await supabase
      .from('volunteer_assignments')
      .select('*, emergency:emergency_requests(*)')
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({ success: true, assignments: assignments || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Submit volunteer emergency report
// @route POST /api/emergencies/:id/report
const submitReport = async (req, res) => {
  try {
    const { description, firstAidProvided, patientCondition, pulse, bloodPressure, vitals } = req.body;
    const volunteerId = req.user ? (req.user.id || req.user._id) : null;

    await supabase
      .from('emergency_requests')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (volunteerId) {
      await supabase
        .from('volunteer_assignments')
        .upsert({
          emergency_id: req.params.id,
          volunteer_id: volunteerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          report: { description, firstAidProvided, patientCondition, pulse, bloodPressure, vitals }
        }, { onConflict: 'emergency_id,volunteer_id' });

      // Update volunteer stats
      const { data: vol } = await supabase
        .from('volunteers')
        .select('total_emergencies_handled')
        .eq('user_id', volunteerId)
        .single();

      if (vol) {
        await supabase
          .from('volunteers')
          .update({
            total_emergencies_handled: (vol.total_emergencies_handled || 0) + 1,
            availability_status: 'available'
          })
          .eq('user_id', volunteerId);
      }
    }

    res.json({ success: true, message: 'Report submitted and emergency resolved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Simulator for landing page (unauthenticated)
const testEmergencySimulator = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const lat = Number(latitude || 12.9352);
    const lng = Number(longitude || 77.6245);

    const { data: volunteers } = await supabase
      .from('volunteers')
      .select('*')
      .eq('availability_status', 'available');

    let nearbyVolunteersCount = 0;
    (volunteers || []).forEach(v => {
      const dist = getDistance(lat, lng, Number(v.latitude || lat), Number(v.longitude || lng));
      if (dist <= (v.service_radius || 5)) nearbyVolunteersCount++;
    });

    const { data: hospitals } = await supabase.from('hospitals').select('*');
    let nearestHospital = null;
    let minDistance = Infinity;

    (hospitals || []).forEach(h => {
      const dist = getDistance(lat, lng, Number(h.latitude || lat), Number(h.longitude || lng));
      if (dist < minDistance) {
        minDistance = dist;
        nearestHospital = {
          id: h.id,
          name: h.hospital_name || 'Medical Center',
          distance: dist.toFixed(2)
        };
      }
    });

    res.json({
      success: true,
      volunteersCount: nearbyVolunteersCount,
      nearestHospital
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create anonymous/guest emergency SOS request
const createGuestEmergency = async (req, res) => {
  return createEmergency(req, res);
};

// @desc Volunteer passes emergency -> Cascades to next nearest volunteer
// @route PUT /api/emergencies/:id/pass
const passEmergency = async (req, res) => {
  try {
    const emergencyId = req.params.id;
    const volunteerId = req.user ? (req.user.id || req.user._id) : req.body.volunteerId;

    const { data: emergency, error: emErr } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('id', emergencyId)
      .single();

    if (emErr || !emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    const declinedVolunteers = emergency.declined_volunteers || [];
    if (volunteerId && !declinedVolunteers.includes(volunteerId)) {
      declinedVolunteers.push(volunteerId);
    }

    const lat = Number(emergency.latitude || 12.9352);
    const lng = Number(emergency.longitude || 77.6245);

    // Query active volunteers excluding those who declined
    const { data: volunteers } = await supabase
      .from('volunteers')
      .select('*, user:users!user_id(id, name, phone)')
      .neq('availability_status', 'offline');

    const eligible = (volunteers || [])
      .filter(v => v.user && !declinedVolunteers.includes(v.user.id))
      .map(v => {
        const vLat = Number(v.latitude || lat);
        const vLng = Number(v.longitude || lng);
        return { volunteer: v, distance: getDistance(lat, lng, vLat, vLng) };
      })
      .sort((a, b) => a.distance - b.distance);

    const nextTarget = eligible[0];

    if (nextTarget) {
      const nextUserId = nextTarget.volunteer.user.id;
      await supabase
        .from('emergency_requests')
        .update({
          current_volunteer: nextUserId,
          declined_volunteers: declinedVolunteers,
          status: 'pending'
        })
        .eq('id', emergencyId);

      await supabase.from('volunteer_assignments').insert({
        emergency_id: emergencyId,
        volunteer_id: nextUserId,
        distance_km: nextTarget.distance.toFixed(2),
        status: 'notified'
      });

      await supabase.from('notifications').insert({
        user_id: nextUserId,
        title: '🚨 Re-Routed Emergency SOS Alert!',
        message: `Previous responder unavailable. Emergency SOS: ${(emergency.emergency_type || 'medical').replace('_', ' ')} is ${nextTarget.distance.toFixed(1)} km away. Can you respond?`,
        type: 'emergency',
        priority: 'high'
      });

      emergency.current_volunteer = nextUserId;
      emergency._id = emergency.id;

      return res.json({
        success: true,
        message: `SOS passed and re-routed to next nearest volunteer (${nextTarget.volunteer.user.name}, ${nextTarget.distance.toFixed(2)} km away).`,
        emergency,
        nextVolunteer: {
          id: nextUserId,
          name: nextTarget.volunteer.user.name,
          phone: nextTarget.volunteer.user.phone,
          distanceKm: nextTarget.distance.toFixed(2)
        }
      });
    } else {
      await supabase
        .from('emergency_requests')
        .update({
          current_volunteer: null,
          declined_volunteers: declinedVolunteers
        })
        .eq('id', emergencyId);

      emergency.current_volunteer = null;
      emergency._id = emergency.id;

      return res.json({
        success: true,
        message: 'No additional volunteers available nearby. Emergency remains escalated to nearest hospital ambulance.',
        emergency,
        nextVolunteer: null
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createEmergency,
  getEmergencies,
  getEmergency,
  updateEmergencyStatus,
  acceptEmergency,
  getVolunteerEmergencies,
  submitReport,
  testEmergencySimulator,
  createGuestEmergency,
  passEmergency
};
