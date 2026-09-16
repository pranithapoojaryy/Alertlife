const AwarenessEvent = require('../models/AwarenessEvent');
const Notification = require('../models/Notification');

const createEvent = async (req, res) => {
  try {
    const organizerId = req.user?._id || req.body.organizerId || null;
    const organizerName = req.user?.name || req.body.speaker || 'Volunteer Organizer';
    const event = await AwarenessEvent.create({
      ...req.body,
      description: req.body.description || req.body.content || req.body.title || '',
      speaker: req.body.speaker || organizerName,
      location: req.body.location || req.body.venue || 'Community Center',
      organizer: organizerId,
      organizerName: organizerName
    });
    res.status(201).json({ success: true, message: 'Event created', event });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await AwarenessEvent.find().populate('organizer', 'name').sort({ date: 1, createdAt: -1 });
    res.json({ success: true, count: events.length, events });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getEventById = async (req, res) => {
  try {
    const event = await AwarenessEvent.findById(req.params.id).populate('organizer', 'name').populate('registrations.userId', 'name email');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const registerForEvent = async (req, res) => {
  try {
    const event = await AwarenessEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const alreadyRegistered = event.registrations.some(r => r.userId?.toString() === req.user?._id?.toString());
    if (alreadyRegistered) return res.status(400).json({ success: false, message: 'Already registered' });
    if (event.registrations.length >= event.maxParticipants) return res.status(400).json({ success: false, message: 'Event is full' });
    if (req.user?._id) {
      event.registrations.push({ userId: req.user._id });
      await event.save();
    }
    res.json({ success: true, message: 'Registered for event successfully' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateEvent = async (req, res) => {
  try {
    const event = await AwarenessEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, event });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { createEvent, getAllEvents, getEventById, registerForEvent, updateEvent };

