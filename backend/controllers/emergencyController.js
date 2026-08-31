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
    const { latitude, longitude, address, emergencyType, description, severity } = req.body;

    const emergency = await EmergencyRequest.create({
      citizenId: req.user._id,
      location: { latitude, longitude, address },
      emergencyType,
      description,
      severity: severity || 'high',
    });

    // Alert nearest hospital
    const hospitals = await Hospital.find({ isVerified: true, isActive: true });
    
    // Sort hospitals by distance
    const hospitalsWithDist = hospitals.map(h => {
      let dist = Infinity;
      if (h.location && h.location.latitude && h.location.longitude) {
        dist = getDistance(latitude, longitude, h.location.latitude, h.location.longitude);
      }
      return { hospital: h, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    const nearestHospitalObj = hospitalsWithDist[0];
    if (nearestHospitalObj && nearestHospitalObj.hospital && nearestHospitalObj.distance < Infinity) {
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
        message: `Auto-dispatched ambulance request for emergency. Location: ${address || `${latitude}, ${longitude}`}`,
        type: 'ambulance',
        priority: 'high',
        relatedId: ambulanceReq._id,
        relatedModel: 'AmbulanceRequest',
      });
    }

    // Find nearby available volunteers within service radius
    const volunteers = await Volunteer.find({
      availabilityStatus: 'available',
      isVerified: true,
      'currentLocation.latitude': { $exists: true },
    }).populate('userId', 'name phone');

    const nearbyVolunteers = volunteers.filter((v) => {
      if (!v.currentLocation?.latitude) return false;
      const dist = getDistance(latitude, longitude, v.currentLocation.latitude, v.currentLocation.longitude);
      return dist <= (v.serviceRadius || 5);
    });

    // Create assignments and notifications for nearby volunteers
    for (const vol of nearbyVolunteers) {
      const assignment = await VolunteerAssignment.create({
        emergencyId: emergency._id,
        volunteerId: vol.userId._id,
        distanceKm: getDistance(latitude, longitude, vol.currentLocation.latitude, vol.currentLocation.longitude).toFixed(2),
      });
      emergency.assignedVolunteers.push(assignment._id);

      await Notification.create({
        userId: vol.userId._id,
        title: '🚨 Emergency Alert!',
        message: `Emergency: ${emergencyType.replace('_', ' ')} near your location. Please respond immediately!`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    // Alert all active staff users (volunteers, hospitals, doctors, admins)
    const staffUsers = await User.find({
      role: { $in: ['volunteer', 'hospital', 'doctor', 'admin'] },
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

    // Prepare top 3 hospitals for the response
    const topHospitals = hospitalsWithDist.slice(0, 3).map(h => ({
      id: h.hospital._id,
      name: h.hospital.hospitalName,
      phone: h.hospital.contactNumber,
      distance: h.distance.toFixed(2)
    })).filter(h => h.distance !== 'Infinity');

    res.status(201).json({
      success: true,
      message: `Emergency created. ${nearbyVolunteers.length} volunteers notified.`,
      emergency,
      volunteersNotified: nearbyVolunteers.length,
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
    if (req.user.role === 'citizen') query.citizenId = req.user._id;

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

// @desc Volunteer accepts emergency
// @route PUT /api/emergencies/:id/accept
// @access Private (volunteer)
const acceptEmergency = async (req, res) => {
  try {
    const assignment = await VolunteerAssignment.findOneAndUpdate(
      { emergencyId: req.params.id, volunteerId: req.user._id },
      { status: 'accepted', acceptedAt: new Date() },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    await EmergencyRequest.findByIdAndUpdate(req.params.id, { status: 'assigned' });

    res.json({ success: true, message: 'Emergency accepted', assignment });
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
// @route POST /api/emergencies/:id/report
// @access Private (volunteer)
const submitReport = async (req, res) => {
  try {
    const { description, firstAidProvided, patientCondition } = req.body;
    const assignment = await VolunteerAssignment.findOneAndUpdate(
      { emergencyId: req.params.id, volunteerId: req.user._id },
      {
        status: 'completed',
        completedAt: new Date(),
        report: { description, firstAidProvided, patientCondition, submittedAt: new Date() },
      },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    await Volunteer.findOneAndUpdate(
      { userId: req.user._id },
      { 
        $inc: { totalEmergenciesHandled: 1, experience: 10 },
        $set: { availabilityStatus: 'available' }
      }
    );

    res.json({ success: true, message: 'Report submitted', assignment });
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
    const { latitude, longitude, emergencyType, guestPhone, description, severity, address } = req.body;
    const phone = guestPhone || req.body.patientPhone || "+1 (555) 019-2834";
    const desc = description || "Emergency SOS First Aid Assistance";

    const emergency = await EmergencyRequest.create({
      guestContact: { phone },
      location: { latitude: latitude || 37.7749, longitude: longitude || -122.4194, address: address || 'Live Citizen Location' },
      emergencyType: emergencyType || 'medical',
      description: desc,
      severity: severity || 'high',
      status: 'locating'
    });

    // Alert nearest hospital
    const hospitals = await Hospital.find({ isVerified: true, isActive: true });
    
    // Sort hospitals by distance
    const hospitalsWithDist = hospitals.map(h => {
      let dist = Infinity;
      if (h.location && h.location.latitude && h.location.longitude) {
        dist = getDistance(latitude, longitude, h.location.latitude, h.location.longitude);
      }
      return { hospital: h, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    const nearestHospitalObj = hospitalsWithDist[0];
    if (nearestHospitalObj && nearestHospitalObj.hospital && nearestHospitalObj.distance < Infinity) {
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

    // Find nearby available volunteers within service radius
    const volunteers = await Volunteer.find({
      availabilityStatus: 'available',
      isVerified: true,
      'currentLocation.latitude': { $exists: true },
    }).populate('userId', 'name phone');

    const nearbyVolunteers = volunteers.filter((v) => {
      if (!v.currentLocation?.latitude) return false;
      const dist = getDistance(latitude, longitude, v.currentLocation.latitude, v.currentLocation.longitude);
      return dist <= (v.serviceRadius || 5);
    });

    for (const vol of nearbyVolunteers) {
      const assignment = await VolunteerAssignment.create({
        emergencyId: emergency._id,
        volunteerId: vol.userId._id,
        distanceKm: getDistance(latitude, longitude, vol.currentLocation.latitude, vol.currentLocation.longitude).toFixed(2),
      });
      emergency.assignedVolunteers.push(assignment._id);

      await Notification.create({
        userId: vol.userId._id,
        title: '🚨 Guest Emergency Alert!',
        message: `Emergency: ${emergencyType.replace('_', ' ')} near your location. Guest Phone: ${guestPhone}`,
        type: 'emergency',
        priority: 'high',
        relatedId: emergency._id,
        relatedModel: 'EmergencyRequest',
      });
    }

    // Alert all active staff users (volunteers, hospitals, doctors, admins)
    const staffUsers = await User.find({
      role: { $in: ['volunteer', 'hospital', 'doctor', 'admin'] },
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
      message: `Emergency created. ${nearbyVolunteers.length} volunteers notified.`,
      volunteersNotified: nearbyVolunteers.length,
      nearestHospitals: topHospitals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createEmergency, getEmergencies, getEmergency, updateEmergencyStatus, acceptEmergency, getVolunteerEmergencies, submitReport, testEmergencySimulator, createGuestEmergency };
