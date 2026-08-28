const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'], default: 'O+' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  medicalHistory: [{ condition: String, since: String, notes: String }],
  allergies: [{ type: String }],
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String },
  }],
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: { type: Date, default: Date.now },
  },
}, { timestamps: true });

module.exports = mongoose.model('Citizen', citizenSchema);
