const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class reference is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: [true, 'Attendance status is required']
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Marked by user is required']
  },
  method: {
    type: String,
    enum: ['face', 'rfid', 'id', 'manual'],
    required: [true, 'Marking method is required']
  },
  synced: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  deviceId: {
    type: String,
    trim: true
  },
  offlineId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  metadata: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    imageUrl: String,
    deviceInfo: {
      model: String,
      os: String,
      version: String
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
attendanceRecordSchema.index({ date: 1, classId: 1 });
attendanceRecordSchema.index({ studentId: 1, date: 1 });
attendanceRecordSchema.index({ classId: 1, date: 1, status: 1 });
attendanceRecordSchema.index({ markedBy: 1, date: 1 });
attendanceRecordSchema.index({ deviceId: 1 });
attendanceRecordSchema.index({ synced: 1 });
attendanceRecordSchema.index({ offlineId: 1 });

// Compound unique index to prevent duplicate attendance for same student on same date
attendanceRecordSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Virtual to populate class data
attendanceRecordSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate student data
attendanceRecordSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate user who marked attendance
attendanceRecordSchema.virtual('markedByUser', {
  ref: 'User',
  localField: 'markedBy',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
attendanceRecordSchema.set('toJSON', { virtuals: true });
attendanceRecordSchema.set('toObject', { virtuals: true });

// Pre-save middleware to set date to start of day
attendanceRecordSchema.pre('save', function(next) {
  if (this.date) {
    this.date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate());
  }
  next();
});

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
