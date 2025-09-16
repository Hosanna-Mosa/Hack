const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  assignedClassIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School reference is required']
  },
  metadata: {
    qualifications: [{
      degree: String,
      institution: String,
      year: Number,
      subject: String
    }],
    experience: {
      years: {
        type: Number,
        min: 0
      },
      previousSchools: [String]
    },
    subjects: [String],
    department: String,
    employeeId: {
      type: String,
      unique: true,
      sparse: true
    },
    joiningDate: Date,
    salary: {
      type: Number,
      min: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
teacherSchema.index({ userId: 1 });
teacherSchema.index({ schoolId: 1 });
teacherSchema.index({ assignedClassIds: 1 });
teacherSchema.index({ 'metadata.employeeId': 1 });

// Virtual to populate user data
teacherSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate school data
teacherSchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate assigned classes
teacherSchema.virtual('assignedClasses', {
  ref: 'Class',
  localField: 'assignedClassIds',
  foreignField: '_id'
});

// Ensure virtual fields are serialized
teacherSchema.set('toJSON', { virtuals: true });
teacherSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Teacher', teacherSchema);
