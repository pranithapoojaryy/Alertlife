const Citizen = require('../models/Citizen');
const User = require('../models/User');

const getCitizenProfile = async (req, res) => {
  try {
    const profile = await Citizen.findOne({ userId: req.user._id }).populate('userId', 'name email phone');
    if (!profile) return res.status(404).json({ success: false, message: 'Citizen profile not found' });
    res.json({ success: true, profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateCitizenProfile = async (req, res) => {
  try {
    const profile = await Citizen.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, upsert: true }
    );
    res.json({ success: true, message: 'Profile updated', profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const profile = await Citizen.findOneAndUpdate(
      { userId: req.user._id },
      { currentLocation: { latitude, longitude, lastUpdated: new Date() } },
      { new: true }
    );
    res.json({ success: true, message: 'Location updated', profile });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAllCitizens = async (req, res) => {
  try {
    const citizens = await Citizen.find().populate('userId', 'name email phone isActive createdAt');
    res.json({ success: true, count: citizens.length, citizens });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getCitizenProfile, updateCitizenProfile, updateLocation, getAllCitizens };
