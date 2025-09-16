const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  passwordHash: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'parent'],
    required: [true, 'Role is required']
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    contact: {
      email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
      },
      phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
      }
    },
    photoUrl: {
      type: String,
      default: null
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'es', 'fr', 'de']
    }
  },
  linkedTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  linkedStudentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ 'profile.contact.email': 1 });
userSchema.index({ role: 1 });
userSchema.index({ linkedTeacherId: 1 });

// Virtual for password (not stored in DB)
userSchema.virtual('password')
  .set(function(password) {
    this._password = password;
  });

// Ensure hashing occurs before validation and require password on create
userSchema.pre('validate', async function(next) {
  try {
    if (this._password) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this._password, salt);
      this._password = undefined;
    }
    if (this.isNew && !this.passwordHash) {
      return next(new Error('Password is required'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user._password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
