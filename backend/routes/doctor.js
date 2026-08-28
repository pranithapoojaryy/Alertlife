const express = require('express');
const router = express.Router();
const { requestConsultation, getDoctorConsultations, updateConsultation } = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const Doctor = require('../models/Doctor');

router.post('/consultation', protect, requestConsultation);
router.get('/consultations', protect, getDoctorConsultations);
router.put('/consultation/:id', protect, updateConsultation);

router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isVerified: true })
      .populate('userId', 'name email phone')
      .populate('hospitalId');
    res.json({ success: true, doctors });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
