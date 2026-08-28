const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find().populate('userId', 'name email phone');
    res.json({ success: true, hospitals });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/profile', protect, roleCheck('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user._id });
    res.json({ success: true, hospital });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/profile', protect, roleCheck('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOneAndUpdate({ userId: req.user._id }, req.body, { new: true, upsert: true });
    res.json({ success: true, hospital });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id/verify', protect, roleCheck('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.json({ success: true, message: 'Hospital verified', hospital });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
