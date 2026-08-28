const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['emergency', 'volunteer_alert', 'ambulance', 'doctor', 'system', 'event'],
    required: true,
  },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
