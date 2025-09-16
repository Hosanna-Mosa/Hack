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
  // classId removed from required fields; student can be created unassigned
  // allow either parentIds or parents array to be provided; both optional here
  body('parentIds').optional().isArray().withMessage('parentIds must be an array'),
  body('parents').optional().isArray().withMessage('parents must be an array'),
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
