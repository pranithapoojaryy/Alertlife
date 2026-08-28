const AmbulanceRequest = require('../models/AmbulanceRequest');
const Hospital = require('../models/Hospital');
const Notification = require('../models/Notification');

const requestAmbulance = async (req, res) => {
  try {
    const { emergencyId, latitude, longitude, address } = req.body;

    // Find nearest available hospital
    const hospitals = await Hospital.find({ isVerified: true, isActive: true });
    const hospital = hospitals.find(h => h.ambulances.some(a => a.status === 'available')) || hospitals[0];

    const ambulanceReq = await AmbulanceRequest.create({
      emergencyId,
      requestedBy: req.user._id,
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

    res.status(201).json({ success: true, message: 'Ambulance requested', ambulanceRequest: ambulanceReq });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAmbulanceRequests = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'hospital') {
      const hospital = await Hospital.findOne({ userId: req.user._id });
      if (hospital) query.hospitalId = hospital._id;
    }
    const requests = await AmbulanceRequest.find(query)
      .populate('emergencyId')
      .populate('requestedBy', 'name phone')
      .populate('hospitalId', 'hospitalName')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const assignAmbulance = async (req, res) => {
  try {
    const { vehicleNumber, driverName, driverPhone } = req.body;
    const req_ = await AmbulanceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'dispatched', ambulanceDetails: { vehicleNumber, driverName, driverPhone }, dispatchedAt: new Date() },
      { new: true }
    );
    if (!req_) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, message: 'Ambulance dispatched', request: req_ });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { requestAmbulance, getAmbulanceRequests, assignAmbulance };
