const supabase = require('../config/supabase');

const getDashboardStats = async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalEmergencies },
      { count: activeEmergencies },
      { count: totalVolunteers },
      { count: verifiedVolunteers },
      { count: totalHospitals },
      { count: totalAmbulanceRequests },
      { count: resolvedEmergencies }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('emergency_requests').select('*', { count: 'exact', head: true }),
      supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'assigned', 'in_progress']),
      supabase.from('volunteers').select('*', { count: 'exact', head: true }),
      supabase.from('volunteers').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('hospitals').select('*', { count: 'exact', head: true }),
      supabase.from('ambulance_requests').select('*', { count: 'exact', head: true }),
      supabase.from('emergency_requests').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    ]);

    // Emergency type breakdown
    const { data: allReqs } = await supabase.from('emergency_requests').select('emergency_type');
    const typeMap = {};
    (allReqs || []).forEach(r => {
      const t = r.emergency_type || 'other';
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const emergencyByType = Object.keys(typeMap).map(k => ({ _id: k, count: typeMap[k] }));

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalEmergencies: totalEmergencies || 0,
        activeEmergencies: activeEmergencies || 0,
        totalVolunteers: totalVolunteers || 0,
        verifiedVolunteers: verifiedVolunteers || 0,
        totalHospitals: totalHospitals || 0,
        totalAmbulanceRequests: totalAmbulanceRequests || 0,
        resolvedEmergencies: resolvedEmergencies || 0,
        resolutionRate: totalEmergencies ? (((resolvedEmergencies || 0) / totalEmergencies) * 100).toFixed(1) : 0,
        emergencyByType,
        monthlyEmergencies: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    const roleMap = {};
    (users || []).forEach(u => {
      const r = u.role || 'citizen';
      roleMap[r] = (roleMap[r] || 0) + 1;
    });
    const roleBreakdown = Object.keys(roleMap).map(r => ({ _id: r, count: roleMap[r] }));

    res.json({ success: true, users: users || [], roleBreakdown });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = !(user.is_active ?? true);
    const { data: updated, error: upErr } = await supabase
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', req.params.id)
      .select()
      .single();

    res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'}`, user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const [
      { data: emergencies },
      { data: ambulances },
      { data: volunteers }
    ] = await Promise.all([
      supabase.from('emergency_requests').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('ambulance_requests').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('volunteers').select('*, user:users!user_id(name)').order('created_at', { ascending: false }).limit(10)
    ]);

    const activities = [];

    (emergencies || []).forEach(e => {
      activities.push({
        id: e.id,
        type: 'emergency',
        icon: '🚨',
        color: '#e63946',
        bg: 'rgba(230,57,70,0.1)',
        message: `New SOS: ${(e.emergency_type || 'medical').replace('_', ' ')} reported by ${e.patient_name || 'Citizen'} at ${e.address || 'location'}`,
        time: e.created_at
      });
    });

    (ambulances || []).forEach(a => {
      activities.push({
        id: a.id,
        type: 'ambulance',
        icon: '🚑',
        color: '#f4a261',
        bg: 'rgba(244,162,97,0.1)',
        message: `Ambulance ${a.status || 'dispatched'} for emergency request.`,
        time: a.created_at
      });
    });

    (volunteers || []).forEach(v => {
      activities.push({
        id: v.id,
        type: 'volunteer',
        icon: '🙋',
        color: '#2ec4b6',
        bg: 'rgba(46,196,182,0.1)',
        message: `New volunteer registered: ${v.user?.name || 'Volunteer'}. Certification: ${v.certification_number || 'Pending'}`,
        time: v.created_at
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ success: true, activities: activities.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats, getUserStats, toggleUserStatus, getRecentActivities };
