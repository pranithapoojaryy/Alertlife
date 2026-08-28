const express = require('express');
const router = express.Router();
const { requestAmbulance, getAmbulanceRequests, assignAmbulance } = require('../controllers/ambulanceController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', protect, requestAmbulance);
router.get('/', protect, getAmbulanceRequests);
router.put('/:id/assign', protect, roleCheck('hospital', 'admin'), assignAmbulance);

module.exports = router;
