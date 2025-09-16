const express = require('express');
const { body, param } = require('express-validator');
const Student = require('../models/Student');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/students
// @desc    Get all students
// @access  Private (Admin, Teacher)
router.get('/', auth, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { classId, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (classId) query.classId = classId;
    if (status) query.status = status;

    const students = await Student.find(query)
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: students,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/students/:id
// @desc    Get student by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/students
// @desc    Create new student
// @access  Private (Admin, Teacher)
router.post('/', [
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('classId').isMongoId().withMessage('Valid class ID is required'),
  body('parentIds').isArray({ min: 1 }).withMessage('At least one parent is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();

    const populatedStudent = await Student.findById(student._id)
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email');

    res.status(201).json({
      success: true,
      data: populatedStudent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student
// @access  Private (Admin, Teacher)
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('classId', 'name grade section')
     .populate('parentIds', 'profile.name profile.contact.email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student
// @access  Private (Admin)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
