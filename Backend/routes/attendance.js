const express = require('express');
const { body, param, query } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
  query('studentId').optional().isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, attendanceController.getAttendance);

// @route   POST /api/attendance
// @desc    Mark attendance
// @access  Private (Teacher, Admin)
router.post('/', [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('classId').isMongoId().withMessage('Valid class ID is required'),
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
  body('method').isIn(['face', 'rfid', 'id', 'manual']).withMessage('Invalid method'),
  handleValidationErrors
], auth, authorize('teacher', 'admin'), attendanceController.createAttendance);

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Teacher, Admin)
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid attendance ID'),
  body('status').optional().isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
  handleValidationErrors
], auth, authorize('teacher', 'admin'), attendanceController.updateAttendance);

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private
router.get('/stats', [
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  handleValidationErrors
], auth, attendanceController.getStats);

module.exports = router;
