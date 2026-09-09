const EmergencyRequest = require('../models/EmergencyRequest');
const VolunteerAssignment = require('../models/VolunteerAssignment');
const Volunteer = require('../models/Volunteer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const Hospital = require('../models/Hospital');

// Calculate distance using Haversine formula
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @desc Create emergency SOS request
// @route POST /api/emergencies
// @access Private (citizen)
const createEmergency = async (req, res) => {
  try {
    const { latitude, longitude, address, emergencyType, description, severity, patientName, patientPhone, patientBlood, allergies, medicalHistory } = req.body;
    const Citizen = require('../models/Citizen');
    const citizenProf = await Citizen.findOne({ userId: req.user._id });

    const emergency = await EmergencyRequest.create({
      citizenId: req.user._id,
      patientName: patientName || req.user.name || 'Citizen In Need',
      patientPhone: patientPhone || req.user.phone || '',
      patientBlood: patientBlood || citizenProf?.bloodGroup || 'O+',
      allergies: allergies || (Array.isArray(citizenProf?.allergies) ? citizenProf.allergies.join(', ') : citizenProf?.allergies) || 'None',
      medicalHistory: medicalHistory || (Array.isArray(citizenProf?.medicalHistory) ? citizenProf.medicalHistory.map(m => m.condition || m).join(', ') : citizenProf?.medicalHistory) || 'None',
      location: { latitude, longitude, address },
      emergencyType: emergencyType || 'other',
      description,
      severity: severity || 'high',
    });

    // Alert nearest hospital immediately for every SOS request
    let hospitals = await Hospital.find({ isActive: { $ne: false } });
    if (!hospitals || hospitals.length === 0) {
      hospitals = await Hospital.find({});
    }
    
    // Sort hospitals by distance from citizen's live location
    const hospitalsWithDist = hospitals.map(h => {
      let dist = 3.5; // default reasonable city distance
      if (h.location && h.location.latitude && h.location.longitude) {
        dist = getDistance(latitude, longitude, h.location.latitude, h.location.longitude);
      }
      return { hospital: h, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    const nearestHospitalObj = hospitalsWithDist[0];
    if (nearestHospitalObj && nearestHospitalObj.hospital) {
      const hospital = nearestHospitalObj.hospital;
      const ambulanceReq = await AmbulanceRequest.create({
        emergencyId: emergency._id,
        requestedBy: req.user._id,
        hospitalId: hospital._id,
        pickupLocation: { latitude, longitude, address },
      });
      
      emergency.ambulanceRequest = ambulanceReq._id;

      await Notification.create({
        userId: hospital.userId,
        title: '🚨 Emergency Ambulance Request!',
        message: `Auto-dispatched ambulance request for emergency (${emergencyType.replace('_', ' ')}). Location: ${address || `${latitude}, ${longitude}`}`,
        type: 'ambulance',
        priority: 'high',
        relatedId: ambulanceReq._id,
        relatedModel: 'AmbulanceRequest',
      });
    }

    // Find available verified active volunteers
    let volunteers = await Volunteer.find({
      isVerified: true,
      availabilityStatus: { $ne: 'offline' }
    }).populate('userId', 'name phone');

    if (!volunteers || volunteers.length === 0) {
      volunteers = await Volunteer.find({
        availabilityStatus: { $ne: 'offline' }
      }).populate('userId', 'name phone');
    }

    // Sort volunteers by proximity to citizen's live GPS coordinates
    const volunteersWithDist = volunteers
      .filter(v => v.userId)
      .map(v => {
        const vLat = v.currentLocation?.latitude || latitude;
        const vLng = v.currentLocation?.longitude || longitude;
        const dist = getDistance(latitude, longitude, vLat, vLng);
        return { volunteer: v, distance: dist, lat: vLat, lng: vLng };
      })
      .sort((a, b) => a.distance - b.distance);

    const primaryTarget = volunteersWithDist[0];

    if (primaryTarget) {
      const targetVol = primaryTarget.volunteer;
      const targetUserId = targetVol.userId._id || targetVol.userId;
      emergency.currentVolunteer = targetUserId;

      const assignment = await VolunteerAssignment.create({
        emergencyId: emergency._id,
        volunteerId: targetUserId,
        distanceKm: primaryTarget.distance.toFixed(2),
        status: 'notified'
      });
      emergency.assignedVolunteers.push(assignment._id);

      await Notification.create({
        userId: targetUserId,
        title: '🚨 Urgent Nearby SOS Alert!',
        message: `Emergency SOS: ${emergencyType.replace('_', ' ')} is ${primaryTarget.distance.toFixed(1)} km from your live location. Respond now!`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    // Alert all active staff users (admins, hospitals, doctors)
    const staffUsers = await User.find({
      role: { $in: ['hospital', 'doctor', 'admin'] },
      isActive: true
    });

    for (const staff of staffUsers) {
      await Notification.create({
        userId: staff._id,
        title: '🚨 Urgent SOS Alert!',
        message: `Emergency SOS triggered: ${emergencyType.replace('_', ' ')} at ${address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}.`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    await emergency.save();

    // Prepare top 3 hospitals for response
    const topHospitals = hospitalsWithDist.slice(0, 3).map(h => ({
      id: h.hospital._id,
      name: h.hospital.hospitalName,
      phone: h.hospital.contactNumber,
      distance: h.distance.toFixed(2)
    })).filter(h => h.distance !== 'Infinity');

    res.status(201).json({
      success: true,
      message: `Emergency created. Nearest volunteer dispatched (${primaryTarget ? primaryTarget.distance.toFixed(2) + ' km' : 'Searching'}). Hospital alerted.`,
      emergency,
      assignedVolunteer: primaryTarget ? {
        id: primaryTarget.volunteer.userId._id,
        name: primaryTarget.volunteer.userId.name,
        phone: primaryTarget.volunteer.userId.phone,
        distanceKm: primaryTarget.distance.toFixed(2)
      } : null,
      nearestHospitals: topHospitals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all emergencies (admin) or user's emergencies
// @route GET /api/emergencies
// @access Private
const getEmergencies = async (req, res) => {
  try {
    let query = {};
    // Volunteers and Admins need to see all active community emergencies to respond
    // Only filter by citizenId if requesting citizen's own history
    if (req.user.role === 'citizen' && req.query.self === 'true') {
      query.citizenId = req.user._id;
    }

    const emergencies = await EmergencyRequest.find(query)
      .populate('citizenId', 'name phone')
      .populate('ambulanceRequest')
      .populate('doctorConsultation')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: emergencies.length, emergencies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get emergency by ID
// @route GET /api/emergencies/:id
// @access Private
const getEmergency = async (req, res) => {
  try {
    const emergency = await EmergencyRequest.findById(req.params.id)
      .populate('citizenId', 'name phone email')
      .populate('citizenProfile')
      .populate({
        path: 'assignedVolunteers',
        populate: { path: 'volunteerId', select: 'name phone' }
      })
      .populate('ambulanceRequest')
      .populate('doctorConsultation');

    if (!emergency) return res.status(404).json({ success: false, message: 'Emergency not found' });

    const emergencyObj = emergency.toObject();
    if (emergencyObj.assignedVolunteers && emergencyObj.assignedVolunteers.length > 0) {
      for (let i = 0; i < emergencyObj.assignedVolunteers.length; i++) {
        const assignment = emergencyObj.assignedVolunteers[i];
        if (assignment.volunteerId) {
          const volunteerProfile = await Volunteer.findOne({ userId: assignment.volunteerId._id || assignment.volunteerId });
          if (volunteerProfile) {
            assignment.volunteerProfile = volunteerProfile;
          }
        }
      }
    }

    res.json({ success: true, emergency: emergencyObj });
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
    const emergency = await EmergencyRequest.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}) },
      { new: true }
    );
    if (!emergency) return res.status(404).json({ success: false, message: 'Emergency not found' });
    res.json({ success: true, message: 'Status updated', emergency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const acceptEmergency = async (req, res) => {
  try {
    const { volunteerName, volunteerPhone, volunteerCert } = req.body;
    const volunteerId = req.user ? req.user._id : (req.body.volunteerId || null);

    const emergency = await EmergencyRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'assigned',
        currentVolunteer: volunteerId,
        $push: {
          notes: {
            author: volunteerName || 'Volunteer',
            content: `Accepted by ${volunteerName || 'Volunteer Responder'}`
          }
        }
      },
      { new: true }
    );

    if (!emergency) return res.status(404).json({ success: false, message: 'Emergency not found' });

    if (volunteerId) {
      await VolunteerAssignment.findOneAndUpdate(
        { emergencyId: req.params.id, volunteerId: volunteerId },
        { status: 'accepted', acceptedAt: new Date() },
        { new: true, upsert: true }
      );
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
    const assignments = await VolunteerAssignment.find({ volunteerId: req.user._id })
      .populate({
        path: 'emergencyId',
        populate: [
          { path: 'citizenId', select: 'name phone' },
          { 
            path: 'ambulanceRequest',
            populate: { path: 'hospitalId', select: 'hospitalName contactNumber' }
          }
        ],
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Submit volunteer emergency report
const submitReport = async (req, res) => {
  try {
    const { description, firstAidProvided, patientCondition, notes, pulse, bloodPressure, vitals } = req.body;
    const volunteerId = req.user ? req.user._id : null;

    await EmergencyRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        $push: {
          notes: {
            author: 'Volunteer Responder',
            content: `Outcome: ${patientCondition || 'Resolved'} | ${firstAidProvided || description || ''} | ${vitals || `BP: ${bloodPressure || 'N/A'}, Pulse: ${pulse || 'N/A'}`}`
          }
        }
      },
      { new: true }
    );

    if (volunteerId) {
      await VolunteerAssignment.findOneAndUpdate(
        { emergencyId: req.params.id, volunteerId: volunteerId },
        {
          status: 'completed',
          completedAt: new Date(),
          report: { description, firstAidProvided, patientCondition, submittedAt: new Date() },
        },
        { new: true, upsert: true }
      );

      await Volunteer.findOneAndUpdate(
        { userId: volunteerId },
        { 
          $inc: { totalEmergenciesHandled: 1, experience: 10 },
          $set: { availabilityStatus: 'available' }
        }
      );
    }

    res.json({ success: true, message: 'Report submitted and emergency resolved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Simulator for landing page (unauthenticated)
// @route POST /api/emergencies/test
// @access Public
const testEmergencySimulator = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    // Find nearby volunteers (within 5km)
    const volunteers = await Volunteer.find({
      availabilityStatus: 'available',
      isVerified: true,
      'currentLocation.latitude': { $exists: true },
    });

    let nearbyVolunteersCount = 0;
    volunteers.forEach((v) => {
      const dist = getDistance(latitude, longitude, v.currentLocation.latitude, v.currentLocation.longitude);
      if (dist <= (v.serviceRadius || 5)) {
        nearbyVolunteersCount++;
      }
    });

    // Find nearest hospital
    const hospitals = await Hospital.find({ isVerified: true, isActive: true });
    let nearestHospital = null;
    let minDistance = Infinity;

    hospitals.forEach((h) => {
      if (h.location && h.location.latitude && h.location.longitude) {
        const dist = getDistance(latitude, longitude, h.location.latitude, h.location.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestHospital = {
            id: h._id,
            name: h.hospitalName,
            distance: dist.toFixed(2),
          };
        }
      }
    });

    res.json({
      success: true,
      volunteersCount: nearbyVolunteersCount,
      nearestHospital,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create anonymous/guest emergency SOS request
const createGuestEmergency = async (req, res) => {
  try {
    const { latitude, longitude, emergencyType, guestPhone, description, severity, address, patientName, patientPhone, patientBlood, allergies, medicalHistory } = req.body;
    const phone = patientPhone || guestPhone || "+1 (555) 019-2834";
    const name = patientName || "Citizen In Need";
    const desc = description || "Emergency SOS First Aid Assistance";

    const emergency = await EmergencyRequest.create({
      guestContact: { phone },
      patientName: name,
      patientPhone: phone,
      patientBlood: patientBlood || 'O+',
      allergies: allergies || 'None declared',
      medicalHistory: medicalHistory || 'None declared',
      location: { latitude: latitude || 37.7749, longitude: longitude || -122.4194, address: address || 'Live Citizen Location' },
      emergencyType: emergencyType || 'other',
      description: desc,
      severity: severity || 'high',
      status: 'locating'
    });

    // Alert nearest hospital
    let hospitals = await Hospital.find({ isActive: { $ne: false } });
    if (!hospitals || hospitals.length === 0) {
      hospitals = await Hospital.find({});
    }
    
    // Sort hospitals by distance
    const hospitalsWithDist = hospitals.map(h => {
      let dist = 3.5;
      if (h.location && h.location.latitude && h.location.longitude) {
        dist = getDistance(latitude, longitude, h.location.latitude, h.location.longitude);
      }
      return { hospital: h, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    const nearestHospitalObj = hospitalsWithDist[0];
    if (nearestHospitalObj && nearestHospitalObj.hospital) {
      const hospital = nearestHospitalObj.hospital;
      const ambulanceReq = await AmbulanceRequest.create({
        emergencyId: emergency._id,
        hospitalId: hospital._id,
        pickupLocation: { latitude, longitude, address: 'Guest Location' },
      });
      emergency.ambulanceRequest = ambulanceReq._id;

      await Notification.create({
        userId: hospital.userId,
        title: '🚨 Guest Emergency Ambulance Request!',
        message: `Auto-dispatched ambulance request for guest emergency. Phone: ${guestPhone}`,
        type: 'ambulance',
        priority: 'high',
        relatedId: ambulanceReq._id,
        relatedModel: 'AmbulanceRequest',
      });
    }

    // Find active volunteers and target closest
    let volunteers = await Volunteer.find({
      $or: [
        { availabilityStatus: 'available' },
        { availabilityStatus: { $exists: false } },
        { isVerified: true }
      ]
    }).populate('userId', 'name phone');

    if (!volunteers || volunteers.length === 0) {
      volunteers = await Volunteer.find({}).populate('userId', 'name phone');
    }

    const volunteersWithDist = volunteers
      .filter(v => v.userId)
      .map(v => {
        const vLat = v.currentLocation?.latitude || latitude;
        const vLng = v.currentLocation?.longitude || longitude;
        const dist = getDistance(latitude, longitude, vLat, vLng);
        return { volunteer: v, distance: dist, lat: vLat, lng: vLng };
      })
      .sort((a, b) => a.distance - b.distance);

    const primaryTarget = volunteersWithDist[0];

    if (primaryTarget) {
      const targetVol = primaryTarget.volunteer;
      const targetUserId = targetVol.userId._id || targetVol.userId;
      emergency.currentVolunteer = targetUserId;

      const assignment = await VolunteerAssignment.create({
        emergencyId: emergency._id,
        volunteerId: targetUserId,
        distanceKm: primaryTarget.distance.toFixed(2),
        status: 'notified'
      });
      emergency.assignedVolunteers.push(assignment._id);

      await Notification.create({
        userId: targetUserId,
        title: '🚨 Guest Emergency Alert!',
        message: `Emergency: ${emergencyType.replace('_', ' ')} is ${primaryTarget.distance.toFixed(1)} km from your live location. Guest Phone: ${guestPhone}`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    // Alert all active staff users (volunteers, hospitals, doctors, admins)
    const staffUsers = await User.find({
      role: { $in: ['hospital', 'doctor', 'admin'] },
      isActive: true
    });

    for (const staff of staffUsers) {
      await Notification.create({
        userId: staff._id,
        title: '🚨 Urgent SOS Alert!',
        message: `Guest Emergency SOS triggered: ${emergencyType.replace('_', ' ')} near guest phone ${guestPhone}.`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    await emergency.save();

    // Prepare top 3 hospitals for the response
    const topHospitals = hospitalsWithDist.slice(0, 3).map(h => ({
      id: h.hospital._id,
      name: h.hospital.hospitalName,
      phone: h.hospital.contactNumber,
      distance: h.distance.toFixed(2)
    })).filter(h => h.distance !== 'Infinity');

    res.status(201).json({
      success: true,
      message: `Emergency created. Nearest volunteer dispatched (${primaryTarget ? primaryTarget.distance.toFixed(2) + ' km' : 'Searching'}). Hospital alerted.`,
      emergency,
      assignedVolunteer: primaryTarget ? {
        id: primaryTarget.volunteer.userId._id,
        name: primaryTarget.volunteer.userId.name,
        phone: primaryTarget.volunteer.userId.phone,
        distanceKm: primaryTarget.distance.toFixed(2)
      } : null,
      nearestHospitals: topHospitals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Volunteer passes/declines emergency -> Cascades to next nearest volunteer
// @route PUT /api/emergencies/:id/pass
// @access Public / Private (Volunteer)
const passEmergency = async (req, res) => {
  try {
    const emergencyId = req.params.id;
    const volunteerId = req.user ? req.user._id : req.body.volunteerId;

    const emergency = await EmergencyRequest.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    // Mark current assignment as rejected/passed if volunteerId provided
    if (volunteerId) {
      await VolunteerAssignment.findOneAndUpdate(
        { emergencyId: emergency._id, volunteerId: volunteerId },
        { status: 'rejected' }
      );
      if (!emergency.declinedVolunteers) {
        emergency.declinedVolunteers = [];
      }
      if (!emergency.declinedVolunteers.includes(volunteerId)) {
        emergency.declinedVolunteers.push(volunteerId);
      }
    }

    const lat = emergency.location?.latitude || 12.9352;
    const lng = emergency.location?.longitude || 77.6245;

    // Find active volunteers excluding those who already declined
    const excludedIds = emergency.declinedVolunteers || [];
    let volunteers = await Volunteer.find({
      isVerified: true,
      availabilityStatus: { $ne: 'offline' }
    }).populate('userId', 'name phone email');

    if (!volunteers || volunteers.length === 0) {
      volunteers = await Volunteer.find({
        availabilityStatus: { $ne: 'offline' }
      }).populate('userId', 'name phone email');
    }

    // Filter out declined volunteers
    const eligibleVolunteers = volunteers.filter(v => {
      if (!v.userId) return false;
      const uId = (v.userId._id || v.userId).toString();
      return !excludedIds.some(declinedId => declinedId.toString() === uId);
    });

    // Sort by proximity
    const sortedEligible = eligibleVolunteers.map(v => {
      const vLat = v.currentLocation?.latitude || lat;
      const vLng = v.currentLocation?.longitude || lng;
      const dist = getDistance(lat, lng, vLat, vLng);
      return { volunteer: v, distance: dist, lat: vLat, lng: vLng };
    }).sort((a, b) => a.distance - b.distance);

    const nextTarget = sortedEligible[0];

    if (nextTarget) {
      const nextTargetUserId = nextTarget.volunteer.userId._id || nextTarget.volunteer.userId;
      emergency.currentVolunteer = nextTargetUserId;
      emergency.status = 'pending';

      const nextAssignment = await VolunteerAssignment.create({
        emergencyId: emergency._id,
        volunteerId: nextTargetUserId,
        distanceKm: nextTarget.distance.toFixed(2),
        status: 'notified'
      });
      emergency.assignedVolunteers.push(nextAssignment._id);

      await Notification.create({
        userId: nextTargetUserId,
        title: '🚨 Re-Routed Emergency SOS Alert!',
        message: `Previous responder unavailable. Emergency SOS: ${emergency.emergencyType.replace('_', ' ')} is ${nextTarget.distance.toFixed(1)} km from you. Can you respond?`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });

      await emergency.save();

      return res.json({
        success: true,
        message: `SOS passed and re-routed to next nearest volunteer (${nextTarget.volunteer.userId.name || 'Responder'}, ${nextTarget.distance.toFixed(2)} km away).`,
        emergency,
        nextVolunteer: {
          id: nextTarget.volunteer.userId._id,
          name: nextTarget.volunteer.userId.name,
          phone: nextTarget.volunteer.userId.phone,
          distanceKm: nextTarget.distance.toFixed(2)
        }
      });
    } else {
      // No more volunteers in range -> escalate status
      emergency.currentVolunteer = null;
      await emergency.save();

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

module.exports = { createEmergency, getEmergencies, getEmergency, updateEmergencyStatus, acceptEmergency, getVolunteerEmergencies, submitReport, testEmergencySimulator, createGuestEmergency, passEmergency };

