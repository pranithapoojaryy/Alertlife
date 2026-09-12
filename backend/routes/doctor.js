const express = require('express');
const router = express.Router();
const { requestConsultation, getDoctorConsultations, updateConsultation } = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const supabase = require('../config/supabase');

router.post('/consultation', protect, requestConsultation);
router.get('/consultations', protect, getDoctorConsultations);
router.put('/consultation/:id', protect, updateConsultation);

router.get('/', async (req, res) => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('*, userId:users!user_id(name, email, phone)');

    if (error) {
      return res.json({ success: true, doctors: [] });
    }
    res.json({ success: true, doctors: doctors || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
