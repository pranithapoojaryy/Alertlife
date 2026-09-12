const supabase = require('../config/supabase');

const getCitizenProfile = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { data: profile, error } = await supabase
      .from('citizens')
      .select('*, userId:users!user_id(id, name, email, phone)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !profile) return res.status(404).json({ success: false, message: 'Citizen profile not found' });
    profile._id = profile.id;
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCitizenProfile = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { data: profile, error } = await supabase
      .from('citizens')
      .upsert({ user_id: userId, ...req.body }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    profile._id = profile.id;
    res.json({ success: true, message: 'Profile updated', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { latitude, longitude } = req.body;
    const { data: profile, error } = await supabase
      .from('citizens')
      .update({ latitude, longitude, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Location updated', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllCitizens = async (req, res) => {
  try {
    const { data: citizens, error } = await supabase
      .from('citizens')
      .select('*, userId:users!user_id(id, name, email, phone, is_active, created_at)');

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, count: (citizens || []).length, citizens: citizens || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCitizenProfile, updateCitizenProfile, updateLocation, getAllCitizens };
