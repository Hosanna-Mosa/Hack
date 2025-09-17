const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new teacher
const createTeacher = async (req, res, next) => {
  try {
    const { name, email, mobile, schoolId } = req.body;

    // Check if user with this email already exists
    const existingUser = await User.findOne({ 'profile.contact.email': email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'A user with this email already exists' 
      });
    }

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(400).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    // Create username from email (before @ symbol)
    const username = email.split('@')[0] + '_' + Date.now();

    // Create user first
    const user = new User({
      username,
      password: 'temp123', // Default password, should be changed on first login
      role: 'teacher',
      profile: {
        name,
        contact: {
          email,
          phone: mobile
        }
      }
    });

    await user.save();

    // Create teacher record
    const teacher = new Teacher({
      userId: user._id,
      schoolId,
      isActive: true
    });

    await teacher.save();

    // Populate the response
    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name');

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: populatedTeacher
    });

  } catch (error) {
    next(error);
  }
};

// Get all teachers for a school
const getTeachers = async (req, res, next) => {
  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: 'School ID is required' 
      });
    }

    const teachers = await Teacher.find({ schoolId, isActive: true })
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers
    });

  } catch (error) {
    next(error);
  }
};

// Update teacher
const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, mobile } = req.body;

    const teacher = await Teacher.findById(id).populate('user');
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // Update user profile
    await User.findByIdAndUpdate(teacher.userId, {
      'profile.name': name,
      'profile.contact.email': email,
      'profile.contact.phone': mobile
    });

    // Get updated teacher with populated data
    const updatedTeacher = await Teacher.findById(id)
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name');

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher
    });

  } catch (error) {
    next(error);
  }
};

// Delete teacher (soft delete)
const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // Soft delete teacher
    teacher.isActive = false;
    await teacher.save();

    // Also deactivate user
    await User.findByIdAndUpdate(teacher.userId, { isActive: false });

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher
};


