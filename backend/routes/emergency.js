const express = require('express');
const router = express.Router();
const { createEmergency, getEmergencies, getEmergency, updateEmergencyStatus, acceptEmergency, getVolunteerEmergencies, submitReport, testEmergencySimulator, createGuestEmergency, passEmergency } = require('../controllers/emergencyController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public & Semi-public live emergency endpoints
router.post('/guest', createGuestEmergency);
router.post('/test', testEmergencySimulator);
router.post('/', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => createEmergency(req, res));
  }
  return createGuestEmergency(req, res);
});
router.get('/', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => getEmergencies(req, res));
  }
  return getEmergencies(req, res);
});
router.get('/volunteer/assigned', protect, roleCheck('volunteer'), getVolunteerEmergencies);
router.get('/:id', getEmergency);
router.put('/:id/status', updateEmergencyStatus);
router.put('/:id/accept', acceptEmergency);
router.put('/:id/pass', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, () => passEmergency(req, res));
  }
  return passEmergency(req, res);
});
router.post('/:id/report', submitReport);

module.exports = router;
