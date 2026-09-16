const mongoose = require('mongoose');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');
const Notification = require('../models/Notification');

const requestAmbulance = async (req, res) => {
  try {
    const { emergencyId, latitude, longitude, address } = req.body;

    const hospitals = await Hospital.find({ isActive: { $ne: false } });
    const hospital = hospitals.find(h => h.ambulances?.some(a => a.status === 'available')) || hospitals[0];

    const ambulanceReq = await AmbulanceRequest.create({
      emergencyId,
      requestedBy: req.user?._id,
      hospitalId: hospital?._id,
      pickupLocation: { latitude, longitude, address },
    });

    if (hospital) {
      await Notification.create({
        userId: hospital.userId,
        title: '🚑 Ambulance Request!',
        message: `Emergency ambulance requested. Location: ${address || `${latitude}, ${longitude}`}`,
        type: 'ambulance',
        priority: 'high',
        relatedId: ambulanceReq._id,
        relatedModel: 'AmbulanceRequest',
      });
    }

    if (emergencyId && mongoose.Types.ObjectId.isValid(emergencyId)) {
      await EmergencyRequest.findByIdAndUpdate(emergencyId, {
        ambulanceRequest: ambulanceReq._id,
        ambulanceStatus: 'requested'
      });
    }

    res.status(201).json({ success: true, message: 'Ambulance requested', ambulanceRequest: ambulanceReq });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAmbulanceRequests = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ userId: req.user._id });
      if (hospital) query.hospitalId = hospital._id;
    }
    const requests = await AmbulanceRequest.find(query)
      .populate('emergencyId')
      .populate('requestedBy', 'name phone')
      .populate('hospitalId', 'hospitalName contactNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const assignAmbulance = async (req, res) => {
  try {
    const { vehicleNumber, driverName, driverPhone, eta } = req.body;
    const rawId = req.params.id;

    let req_ = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      req_ = await AmbulanceRequest.findById(rawId);
      if (!req_) {
        req_ = await AmbulanceRequest.findOne({ emergencyId: rawId });
      }
    }

    const ambDetails = {
      vehicleNumber: vehicleNumber || 'KA-01-ER-1088',
      driverName: driverName || 'Sunil Paramedic',
      driverPhone: driverPhone || '+91 98450 11223',
      eta: eta || '6 mins'
    };

    if (req_) {
      req_.status = 'dispatched';
      req_.ambulanceDetails = ambDetails;
      req_.dispatchedAt = new Date();
      await req_.save();

      if (req_.emergencyId) {
        await EmergencyRequest.findByIdAndUpdate(req_.emergencyId, {
          ambulanceStatus: 'Dispatched',
          ambulanceEta: eta || '6 mins',
          ambulanceDetails: ambDetails
        });
      }
    } else if (mongoose.Types.ObjectId.isValid(rawId)) {
      // Directly update the EmergencyRequest
      await EmergencyRequest.findByIdAndUpdate(rawId, {
        ambulanceStatus: 'Dispatched',
        ambulanceEta: eta || '6 mins',
        ambulanceDetails: ambDetails
      });
    }

    res.json({ success: true, message: 'Ambulance dispatched successfully', ambulanceDetails: ambDetails });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { requestAmbulance, getAmbulanceRequests, assignAmbulance };

