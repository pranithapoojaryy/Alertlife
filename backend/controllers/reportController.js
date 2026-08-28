const User = require('../models/User');
const EmergencyRequest = require('../models/EmergencyRequest');
const Volunteer = require('../models/Volunteer');
const Hospital = require('../models/Hospital');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const DoctorConsultation = require('../models/DoctorConsultation');
const AwarenessEvent = require('../models/AwarenessEvent');

const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalEmergencies, activeEmergencies, totalVolunteers,
      verifiedVolunteers, totalHospitals, totalAmbulanceRequests, resolvedEmergencies] = await Promise.all([
      User.countDocuments(),
      EmergencyRequest.countDocuments(),
      EmergencyRequest.countDocuments({ status: { $in: ['pending', 'assigned', 'in_progress'] } }),
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ isVerified: true }),
      Hospital.countDocuments(),
      AmbulanceRequest.countDocuments(),
      EmergencyRequest.countDocuments({ status: 'resolved' }),
    ]);

    // Emergency type breakdown
    const emergencyByType = await EmergencyRequest.aggregate([
      { $group: { _id: '$emergencyType', count: { $sum: 1 } } },
    ]);

    // Monthly emergencies (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyEmergencies = await EmergencyRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, totalEmergencies, activeEmergencies, totalVolunteers,
        verifiedVolunteers, totalHospitals, totalAmbulanceRequests, resolvedEmergencies,
        resolutionRate: totalEmergencies ? ((resolvedEmergencies / totalEmergencies) * 100).toFixed(1) : 0,
        emergencyByType,
        monthlyEmergencies,
      },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getUserStats = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role isActive isVerified createdAt').sort({ createdAt: -1 }).limit(100);
    const roleBreakdown = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    res.json({ success: true, users, roleBreakdown });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getRecentActivities = async (req, res) => {
  try {
    const [emergencies, ambulances, volunteers] = await Promise.all([
      EmergencyRequest.find().populate('citizenId', 'name').sort({ createdAt: -1 }).limit(10),
      AmbulanceRequest.find().populate('requestedBy', 'name').sort({ createdAt: -1 }).limit(10),
      Volunteer.find().populate('userId', 'name').sort({ createdAt: -1 }).limit(10)
    ]);

    const activities = [];

    emergencies.forEach(e => {
      activities.push({
        id: e._id,
        type: 'emergency',
        icon: '🚨',
        color: '#e63946',
        bg: 'rgba(230,57,70,0.1)',
        message: `New SOS: ${e.emergencyType.replace('_', ' ')} reported by ${e.citizenId?.name || 'Citizen'} at ${e.location?.address || 'captured location'}`,
        time: e.createdAt
      });
    });

    ambulances.forEach(a => {
      activities.push({
        id: a._id,
        type: 'ambulance',
        icon: '🚑',
        color: '#f4a261',
        bg: 'rgba(244,162,97,0.1)',
        message: `Ambulance ${a.status} for emergency request. Driver: ${a.ambulanceDetails?.driverName || 'Assigning...'}`,
        time: a.createdAt
      });
    });

    volunteers.forEach(v => {
      activities.push({
        id: v._id,
        type: 'volunteer',
        icon: '🙋',
        color: '#2ec4b6',
        bg: 'rgba(46,196,182,0.1)',
        message: `New volunteer registered: ${v.userId?.name || 'Volunteer'}. Certification: ${v.certificationNumber || 'Pending'}`,
        time: v.createdAt
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ success: true, activities: activities.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats, getUserStats, toggleUserStatus, getRecentActivities };
