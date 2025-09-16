const AttendanceRecord = require('../models/AttendanceRecord');

// Get attendance with filters and pagination
exports.getAttendance = async (req, res, next) => {
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
    next(error);
  }
};

// Create attendance record
exports.createAttendance = async (req, res, next) => {
  try {
    const attendanceData = { ...req.body, markedBy: req.user._id };

    const attendance = new AttendanceRecord(attendanceData);
    await attendance.save();

    const populatedAttendance = await AttendanceRecord.findById(attendance._id)
      .populate('studentId', 'name studentId photoUrl')
      .populate('classId', 'name grade section')
      .populate('markedBy', 'profile.name');

    res.status(201).json({ success: true, data: populatedAttendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student on this date'
      });
    }
    next(error);
  }
};

// Update attendance record
exports.updateAttendance = async (req, res, next) => {
  try {
    const attendance = await AttendanceRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('studentId', 'name studentId photoUrl')
      .populate('classId', 'name grade section')
      .populate('markedBy', 'profile.name');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

// Get attendance stats
exports.getStats = async (req, res, next) => {
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
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalRecords = await AttendanceRecord.countDocuments(matchQuery);

    res.json({ success: true, data: { stats, total: totalRecords } });
  } catch (error) {
    next(error);
  }
};

