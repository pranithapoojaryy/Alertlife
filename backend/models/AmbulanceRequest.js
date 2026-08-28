const mongoose = require('mongoose');

const ambulanceRequestSchema = new mongoose.Schema({
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'dispatched', 'arrived', 'completed'],
    default: 'pending',
  },
  ambulanceDetails: {
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
    currentLocation: { latitude: Number, longitude: Number },
  },
  pickupLocation: { latitude: Number, longitude: Number, address: String },
  dispatchedAt: { type: Date },
  arrivedAt: { type: Date },
  etaMinutes: { type: Number },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AmbulanceRequest', ambulanceRequestSchema);
