const mongoose = require('mongoose');

const volunteerAssignmentSchema = new mongoose.Schema({
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['notified', 'accepted', 'rejected', 'arrived', 'completed'],
    default: 'notified',
  },
  acceptedAt: { type: Date },
  arrivedAt: { type: Date },
  completedAt: { type: Date },
  report: {
    description: String,
    firstAidProvided: [String],
    patientCondition: String,
    submittedAt: Date,
  },
  distanceKm: { type: Number },
  etaMinutes: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('VolunteerAssignment', volunteerAssignmentSchema);
