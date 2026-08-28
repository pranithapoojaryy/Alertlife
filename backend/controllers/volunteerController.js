const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

const getVolunteerProfile = async (req, res) => {
  try {
    const profile = await Volunteer.findOne({ userId: req.user._id }).populate('userId', 'name email phone');
    if (!profile) return res.status(404).json({ success: false, message: 'Volunteer profile not found' });
    res.json({ success: true, profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateVolunteerProfile = async (req, res) => {
  try {
    const profile = await Volunteer.findOneAndUpdate({ userId: req.user._id }, req.body, { new: true, upsert: true });
    res.json({ success: true, message: 'Profile updated', profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateAvailability = async (req, res) => {
  try {
    const { availabilityStatus, latitude, longitude } = req.body;
    const update = {
      availabilityStatus,
      ...(latitude && longitude ? { currentLocation: { latitude, longitude, lastUpdated: new Date() } } : {}),
    };
    const profile = await Volunteer.findOneAndUpdate({ userId: req.user._id }, update, { new: true });
    res.json({ success: true, message: 'Availability updated', profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAllVolunteers = async (req, res) => {
  try {
    const volunteers = await Volunteer.find().populate('userId', 'name email phone isActive createdAt');
    res.json({ success: true, count: volunteers.length, volunteers });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const verifyVolunteer = async (req, res) => {
  try {
    const vol = await Volunteer.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!vol) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    await User.findByIdAndUpdate(vol.userId, { isVerified: true });
    res.json({ success: true, message: 'Volunteer verified successfully', volunteer: vol });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getVolunteerProfile, updateVolunteerProfile, updateAvailability, getAllVolunteers, verifyVolunteer };
