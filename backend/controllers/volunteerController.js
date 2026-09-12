const supabase = require('../config/supabase');

const getVolunteerProfile = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { data: profile, error } = await supabase
      .from('volunteers')
      .select('*, userId:users!user_id(id, name, email, phone, is_verified)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !profile) {
      return res.status(404).json({ success: false, message: 'Volunteer profile not found' });
    }

    profile._id = profile.id;
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVolunteerProfile = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const {
      certification, certificationNumber, skills, serviceRadius, availabilityStatus
    } = req.body;

    const { data: profile, error } = await supabase
      .from('volunteers')
      .upsert({
        user_id: userId,
        certification,
        certification_number: certificationNumber,
        skills,
        service_radius: serviceRadius,
        availability_status: availabilityStatus
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    profile._id = profile.id;
    res.json({ success: true, message: 'Profile updated', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { availabilityStatus, latitude, longitude } = req.body;

    const updateData = {
      availability_status: availabilityStatus
    };
    if (latitude && longitude) {
      updateData.latitude = latitude;
      updateData.longitude = longitude;
    }

    const { data: profile, error } = await supabase
      .from('volunteers')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({ success: true, message: 'Availability updated', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllVolunteers = async (req, res) => {
  try {
    const { data: volunteers, error } = await supabase
      .from('volunteers')
      .select('*, userId:users!user_id(id, name, email, phone, is_active, is_verified, created_at)');

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const mapped = (volunteers || []).map(v => ({
      ...v,
      _id: v.id,
      isVerified: v.is_verified ?? v.isVerified ?? false,
      availabilityStatus: v.availability_status || 'available'
    }));

    res.json({ success: true, count: mapped.length, volunteers: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyVolunteer = async (req, res) => {
  try {
    const volId = req.params.id;
    const { data: vol, error } = await supabase
      .from('volunteers')
      .update({ is_verified: true })
      .eq('id', volId)
      .select()
      .single();

    if (error || !vol) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    if (vol.user_id) {
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', vol.user_id);
    }

    vol._id = vol.id;
    res.json({ success: true, message: 'Volunteer verified successfully', volunteer: vol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getVolunteerProfile,
  updateVolunteerProfile,
  updateAvailability,
  getAllVolunteers,
  verifyVolunteer
};
