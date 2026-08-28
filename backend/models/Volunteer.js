const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  certification: { type: String, default: '' }, // file path
  certificationNumber: { type: String },
  skills: [{ type: String }],
  availabilityStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
  },
  serviceRadius: { type: Number, default: 5 }, // km
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    lastUpdated: { type: Date, default: Date.now },
  },
  isVerified: { type: Boolean, default: false },
  totalEmergenciesHandled: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  experience: { type: Number, default: 0 }, // years
}, { timestamps: true });

module.exports = mongoose.model('Volunteer', volunteerSchema);
