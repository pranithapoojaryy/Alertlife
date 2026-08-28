const express = require('express');
const router = express.Router();
const { createEmergency, getEmergencies, getEmergency, updateEmergencyStatus, acceptEmergency, getVolunteerEmergencies, submitReport, testEmergencySimulator, createGuestEmergency } = require('../controllers/emergencyController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/guest', createGuestEmergency);
router.post('/test', testEmergencySimulator);
router.post('/', protect, roleCheck('citizen', 'volunteer'), createEmergency);
router.get('/', protect, getEmergencies);
router.get('/volunteer/assigned', protect, roleCheck('volunteer'), getVolunteerEmergencies);
router.get('/:id', protect, getEmergency);
router.put('/:id/status', protect, roleCheck('admin', 'hospital'), updateEmergencyStatus);
router.put('/:id/accept', protect, roleCheck('volunteer'), acceptEmergency);
router.post('/:id/report', protect, roleCheck('volunteer'), submitReport);

module.exports = router;
