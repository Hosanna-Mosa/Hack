const express = require('express');
const { body, param, query } = require('express-validator');
const AttendanceRecord = require('../models/AttendanceRecord');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
  query('studentId').optional().isMongoId().withMessage('Invalid student ID'),
  handleValidationErrors
], auth, async (req, res) => {
  try {
    const { date, classId, studentId, page = 1, limit = 10 } = req.query;
    const query = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (classId) query.classId = classId;
    if (studentId) query.studentId = studentId;

    const attendance = await AttendanceRecord.find(query)
      .populate('studentId', 'name studentId photoUrl')
      .populate('classId', 'name grade section')
      .populate('markedBy', 'profile.name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const total = await AttendanceRecord.countDocuments(query);

    res.json({
      success: true,
      data: attendance,
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
], auth, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const attendanceData = {
      ...req.body,
      markedBy: req.user._id
    };

    const attendance = new AttendanceRecord(attendanceData);
    await attendance.save();

    const populatedAttendance = await AttendanceRecord.findById(attendance._id)
      .populate('studentId', 'name studentId photoUrl')
      .populate('classId', 'name grade section')
      .populate('markedBy', 'profile.name');

    res.status(201).json({
      success: true,
      data: populatedAttendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student on this date'
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Teacher, Admin)
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid attendance ID'),
  body('status').optional().isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
  handleValidationErrors
], auth, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const attendance = await AttendanceRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('studentId', 'name studentId photoUrl')
     .populate('classId', 'name grade section')
     .populate('markedBy', 'profile.name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private
router.get('/stats', [
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  handleValidationErrors
], auth, async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;
    const matchQuery = {};

    if (classId) matchQuery.classId = classId;
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    const stats = await AttendanceRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRecords = await AttendanceRecord.countDocuments(matchQuery);

    res.json({
      success: true,
      data: {
        stats,
        total: totalRecords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
