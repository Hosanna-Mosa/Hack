const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  photoUrl: {
    type: String,
    default: null
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class reference is required']
  },
  rfidTag: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  faceEmbedding: {
    type: [Number],
    default: []
  },
  parentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'graduated', 'suspended'],
    default: 'active'
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  contactInfo: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    },
    medicalInfo: {
      bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
      },
      allergies: [String],
      medications: [String],
      medicalConditions: [String]
    }
  },
  academicInfo: {
    admissionDate: {
      type: Date,
      required: true
    },
    admissionNumber: {
      type: String,
      unique: true,
      required: true
    },
    previousSchool: String,
    transportInfo: {
      route: String,
      stop: String,
      vehicleNumber: String
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
studentSchema.index({ studentId: 1 });
studentSchema.index({ classId: 1 });
studentSchema.index({ parentIds: 1 });
studentSchema.index({ rfidTag: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ 'academicInfo.admissionNumber': 1 });

// Virtual to populate class data
studentSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate parents data
studentSchema.virtual('parents', {
  ref: 'User',
  localField: 'parentIds',
  foreignField: '_id'
});

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', studentSchema);
