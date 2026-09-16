const EducationalContent = require('../models/EducationalContent');

const createContent = async (req, res) => {
  try {
    const authorId = req.user?._id || req.body.authorId || null;
    const authorName = req.user?.name || req.body.author || 'Verified Volunteer Responder';
    const content = await EducationalContent.create({
      ...req.body,
      description: req.body.description || req.body.content || '',
      content: req.body.content || req.body.description || '',
      author: authorId,
      authorName: authorName,
      isPublished: true
    });
    res.status(201).json({ success: true, message: 'Content created', content });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getAllContent = async (req, res) => {
  try {
    const { category, contentType } = req.query;
    let query = { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] };
    if (category && category !== 'all') query.category = category;
    if (contentType && contentType !== 'all') query.contentType = contentType;
    const contents = await EducationalContent.find(query).populate('author', 'name').sort({ createdAt: -1 });
    res.json({ success: true, count: contents.length, contents });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getContentById = async (req, res) => {
  try {
    const content = await EducationalContent.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    ).populate('author', 'name');
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, content });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateContent = async (req, res) => {
  try {
    const content = await EducationalContent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, content });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const deleteContent = async (req, res) => {
  try {
    await EducationalContent.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Content deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { createContent, getAllContent, getContentById, updateContent, deleteContent };

