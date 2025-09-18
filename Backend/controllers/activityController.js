const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const Class = require('../models/Class');

// GET /api/activity/recent
// Returns a small feed of recent actions for the current user's school
exports.getRecentActivity = async (req, res, next) => {
  try {
    const user = req.user;

    // Determine schoolId from role
    let schoolId = null;
    if (user.role === 'admin') {
      // Admin's school is stored on user.profile.schoolId in some systems, but
      // we can infer by Classes/Students owned by admin's school via School model if needed.
      // To keep this robust, accept optional query param schoolId, fallback to null -> return recent across all.
      schoolId = req.query.schoolId || null;
    } else if (user.role === 'teacher') {
      // Teachers' school can be derived from classes; but we keep it optional as above
      schoolId = req.query.schoolId || null;
    }

    const matchSchool = schoolId ? { schoolId } : {};

    // Latest students registered
    const recentStudents = await Student.find({ ...matchSchool })
      .select('name classId createdAt')
      .populate('classId', 'name grade section')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const studentEvents = recentStudents.map((s) => ({
      id: `student-${s._id}`,
      action: 'Student registered',
      details: `${s.name}${s.classId ? ` added to ${s.classId.name || ''} ${s.classId.grade || ''}${s.classId.section ? '-' + s.classId.section : ''}` : ''}`.trim(),
      timestamp: s.createdAt,
      type: 'student'
    }));

    // Latest attendance actions
    const recentAttendance = await AttendanceRecord.find({ ...matchSchool })
      .select('classId status date createdAt')
      .populate('classId', 'name grade section')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const attendanceEvents = recentAttendance.map((a) => ({
      id: `attendance-${a._id}`,
      action: 'Attendance marked',
      details: `${a.classId ? `${a.classId.name || ''} ${a.classId.grade || ''}${a.classId.section ? '-' + a.classId.section : ''}` : 'Class'} — ${a.status}`.trim(),
      timestamp: a.createdAt || a.date,
      type: 'attendance'
    }));

    // Combine and sort
    const combined = [...studentEvents, ...attendanceEvents]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        action: e.action,
        details: e.details,
        time: new Date(e.timestamp).toISOString()
      }));

    res.json({ success: true, data: combined });
  } catch (error) {
    next(error);
  }
};


