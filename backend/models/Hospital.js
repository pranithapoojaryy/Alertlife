const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalName: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  contactNumber: { type: String },
  totalBeds: { type: Number, default: 0 },
  availableBeds: { type: Number, default: 0 },
  ambulances: [{
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
    status: { type: String, enum: ['available', 'dispatched', 'maintenance'], default: 'available' },
    currentLocation: { latitude: Number, longitude: Number },
  }],
  specialties: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
