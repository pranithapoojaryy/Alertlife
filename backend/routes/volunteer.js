const express = require('express');
const router = express.Router();
const { getVolunteerProfile, updateVolunteerProfile, updateAvailability, getAllVolunteers, verifyVolunteer } = require('../controllers/volunteerController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/profile', protect, roleCheck('volunteer'), getVolunteerProfile);
router.put('/profile', protect, roleCheck('volunteer'), updateVolunteerProfile);
router.put('/availability', protect, roleCheck('volunteer'), updateAvailability);
router.get('/', protect, roleCheck('admin', 'hospital'), getAllVolunteers);
router.put('/:id/verify', protect, roleCheck('admin'), verifyVolunteer);

module.exports = router;
