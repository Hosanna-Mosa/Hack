const mongoose = require('mongoose');

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

module.exports = mongoose.model('Parent', parentSchema);


