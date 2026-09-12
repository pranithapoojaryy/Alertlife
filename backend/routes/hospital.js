const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', async (req, res) => {
  try {
    const { data: hospitals, error } = await supabase.from('hospitals').select('*, userId:users!user_id(name, email, phone)');
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, hospitals: hospitals || [] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/profile', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, async () => {
      try {
        const userId = req.user.id || req.user._id;
        const { data: hospital, error } = await supabase.from('hospitals').select('*').eq('user_id', userId).maybeSingle();
        return res.json({ success: true, hospital });
      } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
      }
    });
  }
  try {
    const { data: hospital } = await supabase.from('hospitals').select('*').limit(1).maybeSingle();
    return res.json({ success: true, hospital });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/profile', async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
    return protect(req, res, async () => {
      try {
        const userId = req.user.id || req.user._id;
        const { data: hospital, error } = await supabase
          .from('hospitals')
          .upsert({ user_id: userId, ...req.body }, { onConflict: 'user_id' })
          .select()
          .single();
        return res.json({ success: true, hospital });
      } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
      }
    });
  }
  try {
    const { data: first } = await supabase.from('hospitals').select('id').limit(1).maybeSingle();
    if (first) {
      const { data: hospital } = await supabase.from('hospitals').update(req.body).eq('id', first.id).select().single();
      return res.json({ success: true, hospital });
    }
    const { data: hospital } = await supabase.from('hospitals').insert(req.body).select().single();
    return res.json({ success: true, hospital });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/ambulances', async (req, res, next) => {
  try {
    const { vehicleNumber, driverName, driverPhone, status } = req.body;
    let hospital = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer') && !req.headers.authorization.includes('mock-token')) {
      const jwt = require('jsonwebtoken');
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const { data } = await supabase.from('hospitals').select('*').eq('user_id', decoded.id).maybeSingle();
      hospital = data;
    }
    if (!hospital) {
      const { data } = await supabase.from('hospitals').select('*').limit(1).maybeSingle();
      hospital = data;
    }
    if (hospital) {
      const currentAmbulances = hospital.ambulances || [];
      currentAmbulances.push({
        vehicleNumber,
        driverName,
        driverPhone,
        status: status || 'available'
      });
      const { data: updated } = await supabase.from('hospitals').update({ ambulances: currentAmbulances }).eq('id', hospital.id).select().single();
      return res.json({ success: true, message: 'Ambulance added to fleet', ambulances: updated?.ambulances || currentAmbulances });
    }
    return res.status(404).json({ success: false, message: 'Hospital profile not found' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id/verify', protect, roleCheck('admin'), async (req, res) => {
  try {
    const { data: hospital, error } = await supabase.from('hospitals').update({ is_verified: true }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Hospital verified', hospital });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
