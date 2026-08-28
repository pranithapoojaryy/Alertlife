const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ['citizen', 'volunteer', 'hospital', 'doctor', 'admin'],
    default: 'citizen',
  },
  bloodGroup: { 
    type: String, 
    enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'] 
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
