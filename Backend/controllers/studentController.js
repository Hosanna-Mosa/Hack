const Student = require('../models/Student');

// Get students with filters and pagination
exports.getStudents = async (req, res, next) => {
  try {
    const { classId, status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (classId) query.classId = classId;
    if (status) query.status = status;

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
    const student = new Student(req.body);
    await student.save();

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

