const DoctorConsultation = require('../models/DoctorConsultation');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');

const requestConsultation = async (req, res) => {
  try {
    const { emergencyId, callType } = req.body;
    const doctor = await Doctor.findOne({ availability: 'available', isVerified: true }).populate('userId', 'name');
    if (!doctor) return res.status(404).json({ success: false, message: 'No available doctors at the moment' });

    const consultation = await DoctorConsultation.create({
      emergencyId,
      doctorId: doctor.userId._id,
      volunteerId: req.user._id,
      callType,
    });

    await Notification.create({
      userId: doctor.userId._id,
      title: `📞 ${callType === 'video' ? 'Video' : 'Audio'} Consultation Request`,
      message: 'A volunteer needs your guidance for an emergency patient.',
      type: 'doctor',
      priority: 'high',
      relatedId: consultation._id,
      relatedModel: 'DoctorConsultation',
    });

    await Doctor.findByIdAndUpdate(doctor._id, { availability: 'busy' });

    res.status(201).json({ success: true, message: 'Consultation requested', consultation, doctor: doctor.userId });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getDoctorConsultations = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'volunteer') query.volunteerId = req.user._id;
    // hospital and admin can see all consultations
    const consultations = await DoctorConsultation.find(query)
      .populate('doctorId', 'name')
      .populate('volunteerId', 'name')
      .populate('emergencyId')
      .sort({ createdAt: -1 });
    res.json({ success: true, consultations });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateConsultation = async (req, res) => {
  try {
    const consultation = await DoctorConsultation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found' });
    if (req.body.status === 'completed') {
      const doc = await Doctor.findOne({ userId: consultation.doctorId });
      if (doc) await Doctor.findByIdAndUpdate(doc._id, { availability: 'available' });
    }
    res.json({ success: true, consultation });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { requestConsultation, getDoctorConsultations, updateConsultation };
