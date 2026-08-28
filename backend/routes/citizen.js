const express = require('express');
const router = express.Router();
const { getCitizenProfile, updateCitizenProfile, updateLocation, getAllCitizens } = require('../controllers/citizenController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/profile', protect, roleCheck('citizen'), getCitizenProfile);
router.put('/profile', protect, roleCheck('citizen'), updateCitizenProfile);
router.put('/location', protect, roleCheck('citizen'), updateLocation);
router.get('/', protect, roleCheck('admin'), getAllCitizens);

module.exports = router;
