const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  experience: { type: Number, default: 0 },
  availability: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
  },
  consultationTypes: [{ type: String, enum: ['audio', 'video', 'chat'] }],
  totalConsultations: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
