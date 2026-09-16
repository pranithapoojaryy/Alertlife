const mongoose = require('mongoose');

const awarenessEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  eventType: { type: String, default: 'webinar' },
  type: { type: String, default: 'Health Camp' },
  speaker: { type: String, default: 'Volunteer First Responder' },
  location: { type: String, default: 'Community Center' },
  date: { type: Date, default: Date.now },
  time: { type: String },
  duration: { type: String },
  venue: { type: String },
  isOnline: { type: Boolean, default: false },
  meetingLink: { type: String },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organizerName: { type: String, default: 'Volunteer Organizer' },
  maxParticipants: { type: Number, default: 100 },
  registrations: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registeredAt: { type: Date, default: Date.now },
    attended: { type: Boolean, default: false },
  }],
  status: { type: String, default: 'upcoming' },
  thumbnail: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AwarenessEvent', awarenessEventSchema);

