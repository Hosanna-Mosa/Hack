const express = require('express');
const { body, param, query } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const teacherController = require('../controllers/teacherController');
const mongoose = require('mongoose');

const router = express.Router();

// Admin/Teacher: list by school
router.get('/', [
  query('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
  validate
], teacherController.getTeachers);

// Admin: create teacher
router.post('/', [
  auth,
  authorize('admin'),
  body('name').notEmpty().withMessage('Teacher name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required').isLength({ min: 10, max: 15 }).withMessage('Mobile number must be between 10 and 15 characters'),
  body('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
  validate
], teacherController.createTeacher);

// Admin: update teacher
router.put('/:id', [
  auth,
  authorize('admin'),
  param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid teacher id is required'),
  body('name').optional().notEmpty().withMessage('Teacher name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().notEmpty().withMessage('Mobile number cannot be empty'),
  validate
], teacherController.updateTeacher);

// Admin: delete teacher
router.delete('/:id', [
  auth,
  authorize('admin'),
  param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid teacher id is required'),
  validate
], teacherController.deleteTeacher);

// Teacher auth: login via phone/email
router.post('/login', [
  body('phoneNumber').notEmpty().withMessage('Phone number is required').isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 characters'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
], teacherController.teacherLogin);

// Teacher self-service
router.get('/profile', auth, teacherController.getTeacherProfile);
router.put('/profile', [
  auth,
  body('phoneNumber').optional().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 characters').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please enter a valid phone number'),
  body('metadata.qualifications.*.degree').optional().isLength({ min: 2 }).withMessage('Degree must be at least 2 characters'),
  body('metadata.qualifications.*.institution').optional().isLength({ min: 2 }).withMessage('Institution must be at least 2 characters'),
  body('metadata.qualifications.*.year').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Year must be a valid year'),
  body('metadata.experience.years').optional().isInt({ min: 0 }).withMessage('Experience years must be a positive number'),
  body('metadata.subjects').optional().isArray().withMessage('Subjects must be an array'),
  body('metadata.department').optional().isLength({ min: 2 }).withMessage('Department must be at least 2 characters'),
  body('metadata.employeeId').optional().isLength({ min: 3 }).withMessage('Employee ID must be at least 3 characters'),
  validate
], teacherController.updateTeacherProfile);

router.get('/classes', auth, teacherController.getAssignedClasses);
router.get('/dashboard', auth, teacherController.getTeacherDashboard);
router.post('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate
], teacherController.changePassword);

module.exports = router;
