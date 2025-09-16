const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const authController = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'teacher', 'parent']).withMessage('Invalid role'),
  body('profile.name').notEmpty().withMessage('Name is required'),
  body('profile.contact.email').isEmail().withMessage('Valid email is required'),
  validate
], authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

module.exports = router;
