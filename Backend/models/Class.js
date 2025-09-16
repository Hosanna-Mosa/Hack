const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [50, 'Class name cannot exceed 50 characters']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School reference is required']
  },
  teacherIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  schedule: {
    subjects: [{
      name: {
        type: String,
        required: true
      },
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      timeSlots: [{
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        },
        endTime: {
          type: String,
          match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        },
        room: String
      }]
    }],
    academicYear: {
      start: Date,
      end: Date
    },
    holidays: [{
      date: Date,
      reason: String,
      type: {
        type: String,
        enum: ['national', 'religious', 'school', 'emergency']
      }
    }]
  },
  capacity: {
    type: Number,
    min: 1,
    max: 100,
    default: 50
  },
  section: {
    type: String,
    trim: true,
    uppercase: true
  },
  grade: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
classSchema.index({ name: 1, schoolId: 1 });
classSchema.index({ schoolId: 1 });
classSchema.index({ teacherIds: 1 });
classSchema.index({ studentIds: 1 });
classSchema.index({ grade: 1, section: 1 });

// Virtual to populate school data
classSchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate teachers data
classSchema.virtual('teachers', {
  ref: 'Teacher',
  localField: 'teacherIds',
  foreignField: '_id'
});

// Virtual to populate students data
classSchema.virtual('students', {
  ref: 'Student',
  localField: 'studentIds',
  foreignField: '_id'
});

// Virtual for current student count
classSchema.virtual('currentStudentCount').get(function() {
  return this.studentIds ? this.studentIds.length : 0;
});

// Virtual for current teacher count
classSchema.virtual('currentTeacherCount').get(function() {
  return this.teacherIds ? this.teacherIds.length : 0;
});

// Ensure virtual fields are serialized
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

// Compound unique index for class name and school
classSchema.index({ name: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
