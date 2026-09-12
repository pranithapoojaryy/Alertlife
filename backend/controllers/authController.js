const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { generateToken } = require('../middleware/auth');

// @desc Register new user
// @route POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    let { name, email, password, phone, role, bloodGroup, ...roleData } = req.body;
    
    if (email) email = email.toLowerCase().trim();

    // Check existing user by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userRole = role || 'citizen';
    const isVerified = userRole === 'hospital' || userRole === 'admin' ? true : false;

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        phone,
        role: userRole,
        blood_group: bloodGroup || 'O+',
        is_verified: isVerified,
        is_active: true
      })
      .select()
      .single();

    if (userError || !user) {
      return res.status(500).json({ success: false, message: userError?.message || 'Failed to create user' });
    }

    user._id = user.id;

    // Create role-specific profile in respective Supabase table
    try {
      if (userRole === 'citizen') {
        await supabase.from('citizens').insert({
          user_id: user.id,
          blood_group: bloodGroup || 'O+',
          allergies: roleData.allergies ? (Array.isArray(roleData.allergies) ? roleData.allergies : [roleData.allergies]) : [],
          medical_history: roleData.medicalHistory || roleData.medical_history || []
        });
      } else if (userRole === 'volunteer') {
        await supabase.from('volunteers').insert({
          user_id: user.id,
          availability_status: 'available',
          is_verified: false,
          latitude: 12.9352,
          longitude: 77.6245,
          certification: roleData.certification || 'Certified First Responder',
          certification_number: roleData.certificationNumber || roleData.certification_number || '',
          skills: roleData.skills || ['CPR (Adult/Pediatric)', 'AED Defibrillation', 'Tourniquet / Bleeding Control', 'Choking Relief'],
          service_radius: roleData.serviceRadius || 5
        });
      } else if (userRole === 'hospital') {
        await supabase.from('hospitals').insert({
          user_id: user.id,
          hospital_name: roleData.hospitalName || name || 'City Medical Center',
          registration_number: roleData.registrationNumber || `HOSP-REG-${Date.now().toString().slice(-6)}`,
          contact_number: phone || roleData.contactNumber || '108',
          is_verified: true,
          is_active: true,
          ambulances: roleData.ambulances || [
            { vehicleNumber: 'KA-01-ER-1088', driverName: 'Sunil Paramedic', driverPhone: phone || '+91 98450 11223', status: 'available' }
          ]
        });
      } else if (userRole === 'doctor') {
        await supabase.from('doctors').insert({
          user_id: user.id,
          specialization: roleData.specialization || 'General Physician',
          is_verified: true,
          is_available: true
        });
      }

      // Welcome notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Welcome to Alert Life!',
        message: `Welcome ${name}! Your account has been created successfully.`,
        type: 'system'
      });
    } catch (profileErr) {
      console.warn('Role profile creation warning:', profileErr.message);
    }

    const token = generateToken(user.id);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified ?? isVerified
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Login user with Email or Indian Phone Number
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    let { email, identifier, phone, password } = req.body;
    const loginIdentifier = (identifier || email || phone || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email or phone number and password' });
    }

    const isEmail = loginIdentifier.includes('@');
    let user = null;

    if (isEmail) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginIdentifier.toLowerCase())
        .maybeSingle();
      if (!error && data) user = data;
    } else {
      const digitsOnly = loginIdentifier.replace(/\D/g, '');
      const last10Digits = digitsOnly.slice(-10);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${loginIdentifier},phone.ilike.%${last10Digits}`);
      if (!error && data && data.length > 0) {
        user = data[0];
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/phone and password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/phone and password.' });
    }

    if (user.is_active === false || user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    user._id = user.id;
    const token = generateToken(user.id);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '',
        isVerified: user.is_verified ?? user.isVerified ?? false
      },
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
    const userId = req.user.id || req.user._id;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, blood_group, is_verified, is_active, avatar, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user._id = user.id;
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
    const userId = req.user.id || req.user._id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

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
    const userId = req.user.id || req.user._id;

    await supabase.from('citizens').delete().eq('user_id', userId);
    await supabase.from('volunteers').delete().eq('user_id', userId);
    await supabase.from('hospitals').delete().eq('user_id', userId);
    await supabase.from('doctors').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe, updatePassword, deleteAccount };
