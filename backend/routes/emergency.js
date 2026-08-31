const express = require('express');
const router = express.Router();
const { createEmergency, getEmergencies, getEmergency, updateEmergencyStatus, acceptEmergency, getVolunteerEmergencies, submitReport, testEmergencySimulator, createGuestEmergency } = require('../controllers/emergencyController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public & Semi-public live emergency endpoints
router.post('/guest', createGuestEmergency);
router.post('/test', testEmergencySimulator);
router.post('/', async (req, res, next) => {
  // If request has valid auth header, use protected createEmergency, otherwise fallback to guest emergency creation
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => createEmergency(req, res));
  }
  // Otherwise create public emergency directly
  return createGuestEmergency(req, res);
});
router.get('/', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => getEmergencies(req, res));
  }
  // Public emergency fetch for cross-device synchronization
  try {
    const EmergencyRequest = require('../models/EmergencyRequest');
    const emergencies = await EmergencyRequest.find({})
      .populate('citizenId', 'name phone')
      .populate('ambulanceRequest')
      .populate('doctorConsultation')
      .sort({ createdAt: -1 });
    return res.json({ success: true, count: emergencies.length, emergencies });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/volunteer/assigned', protect, roleCheck('volunteer'), getVolunteerEmergencies);
router.get('/:id', getEmergency);
router.put('/:id/status', updateEmergencyStatus);
router.put('/:id/accept', acceptEmergency);
router.post('/:id/report', submitReport);

module.exports = router;
