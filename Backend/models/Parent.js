const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email'],
    default: null
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    match: [/^[+]?\d{7,15}$/ , 'Please provide a valid mobile number']
  },
  password: {
    type: String,
    default: 'parent123'
  },
  isDefaultPassword: {
    type: Boolean,
    default: true
  },
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes to speed up lookups
parentSchema.index({ mobile: 1 });
parentSchema.index({ email: 1 });
parentSchema.index({ studentIds: 1 });

// Hash password before saving
parentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
parentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Parent', parentSchema);


