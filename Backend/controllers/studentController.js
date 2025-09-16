const Student = require('../models/Student');
const Parent = require('../models/Parent');
const School = require('../models/School');
const Teacher = require('../models/Teacher');

// Get students with filters and pagination
exports.getStudents = async (req, res, next) => {
  try {
    const { classId, status, schoolId, page = 1, limit = 10 } = req.query;
    const query = {};

    if (classId) query.classId = classId;
    if (status) query.status = status;
    if (schoolId) query.schoolId = schoolId;

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
    next(error);
  }
};

// Get single student
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Create student
exports.createStudent = async (req, res, next) => {
  try {
    const { parents, ...studentPayload } = req.body;

    // Attach schoolId automatically if not provided
    if (!studentPayload.schoolId) {
      try {
        let resolvedSchoolId = null;
        if (req.user?.role === 'admin') {
          const s = await School.findOne({ adminIds: req.user._id }).select('_id');
          resolvedSchoolId = s?._id || null;
        } else if (req.user?.role === 'teacher') {
          const t = await Teacher.findOne({ userId: req.user._id }).select('schoolId');
          resolvedSchoolId = t?.schoolId || null;
        }
        if (resolvedSchoolId) studentPayload.schoolId = resolvedSchoolId;
      } catch {}
    }

    const student = new Student({ ...studentPayload, classId: studentPayload.classId || null });
    await student.save();

    // Optionally create parent records based on provided details
    if (Array.isArray(parents) && parents.length > 0) {
      const parentDocs = await Parent.insertMany(parents.map(p => ({
        name: p.name,
        email: p.email || null,
        mobile: p.mobile,
        password: p.password || 'parent123',
        studentIds: [student._id]
      })));
      // store parent ids back to student if schema expects parentIds
      try {
        student.parentIds = parentDocs.map(pd => pd._id);
        await student.save();
      } catch {}
    }

    const populatedStudent = await Student.findById(student._id)
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email');

    res.status(201).json({ success: true, data: populatedStudent });
  } catch (error) {
    next(error);
  }
};

// Update student
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('classId', 'name grade section')
      .populate('parentIds', 'profile.name profile.contact.email');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// Delete student
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};

