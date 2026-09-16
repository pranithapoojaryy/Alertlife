const mongoose = require('mongoose');

const educationalContentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  content: { type: String, default: '' },
  category: { type: String, default: 'First Aid Guides' },
  contentType: { type: String, default: 'article' },
  filePath: { type: String },
  videoUrl: { type: String },
  imageUrl: { type: String },
  docUrl: { type: String },
  mediaUrl: { type: String },
  thumbnail: { type: String },
  duration: { type: String },
  readTime: { type: String, default: '5 min read' },
  difficulty: { type: String, default: 'beginner' },
  tags: [{ type: String }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: 'Verified Volunteer Responder' },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('EducationalContent', educationalContentSchema);

