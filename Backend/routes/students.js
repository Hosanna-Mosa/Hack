const express = require('express');
const { body, param } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const studentController = require('../controllers/studentController');

const router = express.Router();

// @route   GET /api/students
// @desc    Get all students
// @access  Private (Admin, Teacher)
router.get('/', auth, authorize('admin', 'teacher'), studentController.getStudents);

// @route   GET /api/students/:id
// @desc    Get student by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, studentController.getStudentById);

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
], auth, authorize('admin', 'teacher'), studentController.createStudent);

// @route   PUT /api/students/:id
// @desc    Update student
// @access  Private (Admin, Teacher)
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), studentController.updateStudent);

// @route   DELETE /api/students/:id
// @desc    Delete student
// @access  Private (Admin)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, authorize('admin'), studentController.deleteStudent);

module.exports = router;
