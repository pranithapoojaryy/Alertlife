const supabase = require('../config/supabase');

const requestAmbulance = async (req, res) => {
  try {
    const { emergencyId, latitude, longitude, address } = req.body;
    const requestedBy = req.user ? (req.user.id || req.user._id) : null;

    // Find nearest available hospital
    const { data: hospitals } = await supabase.from('hospitals').select('*');
    const hospital = hospitals && hospitals[0];

    const { data: ambulanceReq, error } = await supabase
      .from('ambulance_requests')
      .insert({
        emergency_id: emergencyId,
        requested_by: requestedBy,
        hospital_id: hospital?.id,
        pickup_location: { latitude, longitude, address },
        status: 'requested'
      })
      .select()
      .single();

    if (hospital && hospital.user_id) {
      await supabase.from('notifications').insert({
        user_id: hospital.user_id,
        title: '🚑 Ambulance Request!',
        message: `Emergency ambulance requested. Location: ${address || `${latitude}, ${longitude}`}`,
        type: 'ambulance',
        priority: 'high'
      });
    }

    if (ambulanceReq) ambulanceReq._id = ambulanceReq.id;
    res.status(201).json({ success: true, message: 'Ambulance requested', ambulanceRequest: ambulanceReq });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAmbulanceRequests = async (req, res) => {
  try {
    let query = supabase.from('ambulance_requests').select('*').order('created_at', { ascending: false });
    
    if (req.user && req.user.role === 'hospital') {
      const { data: hospital } = await supabase.from('hospitals').select('id').eq('user_id', req.user.id || req.user._id).maybeSingle();
      if (hospital) query = query.eq('hospital_id', hospital.id);
    }
    const { data: requests, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const mapped = (requests || []).map(r => ({
      ...r,
      _id: r.id,
      ambulanceDetails: r.ambulance_details || r.ambulanceDetails,
      pickupLocation: r.pickup_location || r.pickupLocation
    }));

    res.json({ success: true, count: mapped.length, requests: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignAmbulance = async (req, res) => {
  try {
    const { vehicleNumber, driverName, driverPhone, eta } = req.body;

    const { data: req_, error } = await supabase
      .from('ambulance_requests')
      .update({
        status: 'dispatched',
        ambulance_details: { vehicleNumber, driverName, driverPhone, eta: eta || '6 mins' },
        dispatched_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !req_) return res.status(404).json({ success: false, message: 'Request not found' });

    if (req_.emergency_id) {
      await supabase
        .from('emergency_requests')
        .update({
          ambulance_status: 'Dispatched',
          ambulance_eta: eta || '6 mins',
          ambulance_details: { vehicleNumber, driverName, driverPhone }
        })
        .eq('id', req_.emergency_id);
    }

    req_._id = req_.id;
    res.json({ success: true, message: 'Ambulance dispatched', request: req_ });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requestAmbulance, getAmbulanceRequests, assignAmbulance };
