const mongoose = require('mongoose');

const awarenessEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  eventType: { type: String, enum: ['webinar', 'workshop', 'seminar', 'online_session'], required: true },
  date: { type: Date, required: true },
  time: { type: String },
  duration: { type: String },
  venue: { type: String },
  isOnline: { type: Boolean, default: true },
  meetingLink: { type: String },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  maxParticipants: { type: Number, default: 100 },
  registrations: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registeredAt: { type: Date, default: Date.now },
    attended: { type: Boolean, default: false },
  }],
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  thumbnail: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AwarenessEvent', awarenessEventSchema);
