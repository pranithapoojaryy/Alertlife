const supabase = require('../config/supabase');

const createEvent = async (req, res) => {
  try {
    const organizerId = req.user ? (req.user.id || req.user._id) : null;
    const { data: event, error } = await supabase
      .from('awareness_events')
      .insert({ ...req.body, organizer_id: organizerId, registrations: [] })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    if (event) event._id = event.id;
    res.status(201).json({ success: true, message: 'Event created', event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('awareness_events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      return res.json({ success: true, count: 0, events: [] });
    }
    const mapped = (events || []).map(e => ({
      ...e,
      _id: e.id,
      attendees: (e.registrations || []).length
    }));
    res.json({ success: true, count: mapped.length, events: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('awareness_events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !event) return res.status(404).json({ success: false, message: 'Event not found' });
    event._id = event.id;
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const { data: event, error } = await supabase
      .from('awareness_events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !event) return res.status(404).json({ success: false, message: 'Event not found' });

    const registrations = event.registrations || [];
    if (registrations.some(r => r === userId || r.userId === userId)) {
      return res.status(400).json({ success: false, message: 'Already registered' });
    }
    registrations.push({ userId, registeredAt: new Date().toISOString() });

    await supabase
      .from('awareness_events')
      .update({ registrations })
      .eq('id', req.params.id);

    res.json({ success: true, message: 'Registered for event successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('awareness_events')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    event._id = event.id;
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createEvent, getAllEvents, getEventById, registerForEvent, updateEvent };
