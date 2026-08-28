const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestContact: { phone: { type: String } },
  citizenProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
  },
  emergencyType: {
    type: String,
    enum: ['cardiac_arrest', 'accident', 'stroke', 'breathing', 'seizure', 'other'],
    required: true,
  },
  description: { type: String },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'high' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'resolved', 'cancelled'],
    default: 'pending',
  },
  assignedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerAssignment' }],
  ambulanceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'AmbulanceRequest' },
  doctorConsultation: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorConsultation' },
  resolvedAt: { type: Date },
  notes: [{ author: String, content: String, timestamp: { type: Date, default: Date.now } }],
}, { timestamps: true });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
