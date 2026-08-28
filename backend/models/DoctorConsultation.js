const mongoose = require('mongoose');

const doctorConsultationSchema = new mongoose.Schema({
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  callType: { type: String, enum: ['audio', 'video'], required: true },
  status: {
    type: String,
    enum: ['requested', 'connecting', 'active', 'completed', 'missed'],
    default: 'requested',
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  durationMinutes: { type: Number },
  medicalNotes: { type: String },
  recommendations: [{ type: String }],
  prescription: { type: String },
  followUpRequired: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('DoctorConsultation', doctorConsultationSchema);
