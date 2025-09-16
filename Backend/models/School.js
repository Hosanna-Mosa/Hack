const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    maxlength: [200, 'School name cannot exceed 200 characters']
  },
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contactInfo: {
    phone: [String],
    email: [String],
    website: String,
    fax: String
  },
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    academicYear: {
      start: Date,
      end: Date
    },
    attendanceSettings: {
      lateThreshold: {
        type: Number,
        default: 15 // minutes
      },
      workingDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      }],
      workingHours: {
        start: String,
        end: String
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

schoolSchema.index({ name: 1 });
schoolSchema.index({ adminIds: 1 });

schoolSchema.virtual('admins', {
  ref: 'User',
  localField: 'adminIds',
  foreignField: '_id'
});

schoolSchema.set('toJSON', { virtuals: true });
schoolSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('School', schoolSchema);
