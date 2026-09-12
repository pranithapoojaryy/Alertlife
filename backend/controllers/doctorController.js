const supabase = require('../config/supabase');

const requestConsultation = async (req, res) => {
  try {
    const { emergencyId, callType } = req.body;
    const { data: doctors } = await supabase
      .from('doctors')
      .select('*, user:users!user_id(id, name)')
      .limit(1);

    const doctor = doctors && doctors[0];

    const { data: consultation, error } = await supabase
      .from('doctor_consultations')
      .insert({
        emergency_id: emergencyId,
        doctor_id: doctor?.user_id,
        volunteer_id: req.user ? (req.user.id || req.user._id) : null,
        call_type: callType,
        status: 'active'
      })
      .select()
      .single();

    if (consultation) consultation._id = consultation.id;
    res.status(201).json({ success: true, message: 'Consultation requested', consultation, doctor: doctor?.user || { name: 'Dr. Specialist' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDoctorConsultations = async (req, res) => {
  try {
    const { data: consultations, error } = await supabase
      .from('doctor_consultations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.json({ success: true, consultations: [] });
    }
    const mapped = (consultations || []).map(c => ({ ...c, _id: c.id }));
    res.json({ success: true, consultations: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateConsultation = async (req, res) => {
  try {
    const { data: consultation, error } = await supabase
      .from('doctor_consultations')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    consultation._id = consultation.id;
    res.json({ success: true, consultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requestConsultation, getDoctorConsultations, updateConsultation };
