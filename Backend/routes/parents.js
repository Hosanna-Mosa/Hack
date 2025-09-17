const express = require('express');
const { body } = require('express-validator');
const { parentAuth } = require('../middleware/parentAuth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const parentController = require('../controllers/parentController');

const router = express.Router();

// @route   POST /api/parents/login
// @desc    Parent login with mobile and password
// @access  Public
router.post('/login', [
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], parentController.login);

// @route   POST /api/parents/change-password
// @desc    Change parent password
// @access  Private (Parent only)
router.post('/change-password', [
  parentAuth,
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
  validate
], parentController.changePassword);

// @route   GET /api/parents/profile
// @desc    Get parent profile
// @access  Private (Parent only)
router.get('/profile', parentAuth, parentController.getProfile);

// @route   GET /api/parents/students/:studentId/attendance
// @desc    Get student attendance data
// @access  Private (Parent only)
router.get('/students/:studentId/attendance', parentAuth, parentController.getStudentAttendance);

// @route   PUT /api/parents/profile
// @desc    Update parent profile
// @access  Private (Parent only)
router.put('/profile', [
  parentAuth,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  validate
], parentController.updateProfile);

module.exports = router;
