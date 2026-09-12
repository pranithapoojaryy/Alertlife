const supabase = require('../config/supabase');

const createContent = async (req, res) => {
  try {
    const authorId = req.user ? (req.user.id || req.user._id) : null;
    const { data: content, error } = await supabase
      .from('educational_contents')
      .insert({ ...req.body, author_id: authorId })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    if (content) content._id = content.id;
    res.status(201).json({ success: true, message: 'Content created', content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllContent = async (req, res) => {
  try {
    const { category, contentType } = req.query;
    let query = supabase.from('educational_contents').select('*').order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (contentType) query = query.eq('content_type', contentType);

    const { data: contents, error } = await query;
    if (error) {
      return res.json({ success: true, count: 0, contents: [] });
    }
    const mapped = (contents || []).map(c => ({
      ...c,
      _id: c.id,
      readTime: c.read_time || '5 min read',
      videoUrl: c.video_url,
      imageUrl: c.image_url || c.file_path
    }));
    res.json({ success: true, count: mapped.length, contents: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getContentById = async (req, res) => {
  try {
    const { data: content, error } = await supabase
      .from('educational_contents')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !content) return res.status(404).json({ success: false, message: 'Content not found' });
    content._id = content.id;
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateContent = async (req, res) => {
  try {
    const { data: content, error } = await supabase
      .from('educational_contents')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !content) return res.status(404).json({ success: false, message: 'Content not found' });
    content._id = content.id;
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteContent = async (req, res) => {
  try {
    await supabase.from('educational_contents').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createContent, getAllContent, getContentById, updateContent, deleteContent };
