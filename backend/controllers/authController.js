const User = require('../models/User');
const Citizen = require('../models/Citizen');
const Volunteer = require('../models/Volunteer');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');
const { generateToken } = require('../middleware/auth');

// @desc Register new user
// @route POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    let { name, email, password, phone, role, bloodGroup, ...roleData } = req.body;
    
    if (email) email = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone, role, bloodGroup });

    // Create role-specific profile
    if (role === 'citizen') {
      await Citizen.create({ userId: user._id, bloodGroup, ...roleData });
    } else if (role === 'volunteer') {
      await Volunteer.create({ userId: user._id, ...roleData });
    } else if (role === 'hospital') {
      await Hospital.create({ userId: user._id, ...roleData });
    } else if (role === 'doctor') {
      await Doctor.create({ userId: user._id, ...roleData });
    }

    // Welcome notification
    await Notification.create({
      userId: user._id,
      title: 'Welcome to Alert Life!',
      message: `Welcome ${name}! Your account has been created successfully.`,
      type: 'system',
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Login user
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    email = email.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, isVerified: user.isVerified },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update password
// @route PUT /api/auth/password
// @access Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete user account
// @route DELETE /api/auth/me
// @access Private
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete role-specific profile
    if (user.role === 'citizen') {
      await Citizen.findOneAndDelete({ userId: user._id });
    } else if (user.role === 'volunteer') {
      await Volunteer.findOneAndDelete({ userId: user._id });
    } else if (user.role === 'hospital') {
      await Hospital.findOneAndDelete({ userId: user._id });
    } else if (user.role === 'doctor') {
      await Doctor.findOneAndDelete({ userId: user._id });
    }

    // Delete notifications
    await Notification.deleteMany({ userId: user._id });

    // Finally delete the user
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe, updatePassword, deleteAccount };
