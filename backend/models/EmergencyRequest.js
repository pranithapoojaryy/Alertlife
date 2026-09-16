const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestContact: { phone: { type: String } },
  patientName: { type: String },
  patientPhone: { type: String },
  patientBlood: { type: String },
  allergies: { type: String },
  medicalHistory: { type: String },
  citizenProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
  },
  emergencyType: {
    type: String,
    default: 'other',
  },
  description: { type: String },
  severity: { type: String, default: 'high' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'arrived', 'resolved', 'cancelled', 'closed'],
    default: 'pending',
  },
  currentVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  volunteerDetails: {
    name: { type: String },
    phone: { type: String },
    certification: { type: String },
    currentLocation: { latitude: Number, longitude: Number }
  },
  declinedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerAssignment' }],
  ambulanceStatus: { type: String, default: 'requested' },
  ambulanceEta: { type: String, default: '6 mins' },
  ambulanceDetails: {
    vehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    hospitalName: { type: String }
  },
  ambulanceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'AmbulanceRequest' },
  doctorConsultation: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorConsultation' },
  resolvedAt: { type: Date },
  notes: [{ author: String, content: String, timestamp: { type: Date, default: Date.now } }],
}, { timestamps: true });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);

