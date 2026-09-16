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
    const { name, phone, ...volData } = req.body;
    if (name || phone) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (phone) userUpdate.phone = phone;
      await User.findByIdAndUpdate(req.user._id, userUpdate);
    }
    const profile = await Volunteer.findOneAndUpdate({ userId: req.user._id }, { ...volData, ...(req.body) }, { new: true, upsert: true }).populate('userId', 'name email phone');
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
    const volunteers = await Volunteer.find().populate('userId', 'name email phone isActive isVerified createdAt');
    // Also include any users with role='volunteer' who may not have a populated volunteer record yet
    const volunteerUsers = await User.find({ role: 'volunteer' }, 'name email phone isActive isVerified createdAt');
    const existingUserIds = new Set(volunteers.map(v => v.userId?._id?.toString() || v.userId?.toString()));

    const combined = [...volunteers];
    for (const u of volunteerUsers) {
      if (!existingUserIds.has(u._id.toString())) {
        combined.push({
          _id: u._id,
          userId: u,
          certification: 'Certified First Responder',
          skills: ['CPR', 'First Aid', 'AED'],
          availabilityStatus: 'available',
          isVerified: u.isVerified || false,
          totalEmergenciesHandled: 0,
          createdAt: u.createdAt
        });
      }
    }

    res.json({ success: true, count: combined.length, volunteers: combined });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const mongoose = require('mongoose');

const verifyVolunteer = async (req, res) => {
  try {
    const rawId = req.params.id;
    let vol = null;
    let user = null;

    if (mongoose.Types.ObjectId.isValid(rawId)) {
      vol = await Volunteer.findById(rawId);
      if (!vol) {
        vol = await Volunteer.findOne({ userId: rawId });
      }
      if (!vol) {
        user = await User.findById(rawId);
      }
    }

    if (!vol && !user) {
      user = await User.findOne({
        $or: [
          { email: rawId.toLowerCase() },
          { phone: rawId }
        ]
      });
      if (user) {
        vol = await Volunteer.findOne({ userId: user._id });
      }
    }

    if (!vol && !user) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    if (user) {
      user.isVerified = true;
      await user.save();
    }

    if (vol) {
      vol.isVerified = true;
      vol.availabilityStatus = 'available';
      await vol.save();
      if (vol.userId && !user) {
        await User.findByIdAndUpdate(vol.userId, { isVerified: true });
      }
    } else if (user) {
      vol = await Volunteer.findOneAndUpdate(
        { userId: user._id },
        { isVerified: true, availabilityStatus: 'available' },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Volunteer verified successfully', volunteer: vol });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getVolunteerProfile, updateVolunteerProfile, updateAvailability, getAllVolunteers, verifyVolunteer };

