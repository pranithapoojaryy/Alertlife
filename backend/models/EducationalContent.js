const mongoose = require('mongoose');

const educationalContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['cpr', 'first_aid', 'awareness', 'health_tips', 'article'],
    required: true,
  },
  contentType: { type: String, enum: ['video', 'article', 'pdf', 'image'], required: true },
  filePath: { type: String },
  videoUrl: { type: String },
  thumbnail: { type: String },
  duration: { type: String },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  tags: [{ type: String }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('EducationalContent', educationalContentSchema);
