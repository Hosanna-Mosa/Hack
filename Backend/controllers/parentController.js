const Parent = require('../models/Parent');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const jwt = require('jsonwebtoken');

const signToken = (parent) => {
  const secret = process.env.JWT_SECRET || 'dev_default_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  
  return jwt.sign(
    { id: parent._id, role: 'parent' },
    secret,
    { expiresIn }
  );
};

// Parent login
exports.login = async (req, res, next) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile number and password are required' 
      });
    }

    // Find parent by mobile number
    const parent = await Parent.findOne({ mobile, isActive: true });
    if (!parent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid mobile number or password' 
      });
    }

    // Check password
    const isMatch = await parent.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid mobile number or password' 
      });
    }

    const token = signToken(parent);

    res.json({ 
      success: true, 
      token, 
      parent: {
        _id: parent._id,
        name: parent.name,
        mobile: parent.mobile,
        email: parent.email,
        isDefaultPassword: parent.isDefaultPassword,
        studentIds: parent.studentIds
      }
    });

  } catch (error) {
    next(error);
  }
};

// Change parent password
exports.changePassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const parentId = req.user.id; // From auth middleware

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password and confirm password are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parent not found' 
      });
    }

    // Update password and mark as not default
    parent.password = newPassword;
    parent.isDefaultPassword = false;
    await parent.save();

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    next(error);
  }
};

// Get parent profile with student data
exports.getProfile = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    
    const parent = await Parent.findById(parentId)
      .populate({
        path: 'studentIds',
        select: 'name studentId classId photoUrl dateOfBirth academicInfo contactInfo status isActive',
        populate: {
          path: 'classId',
          select: 'name grade section'
        }
      })
      .select('-password');

    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parent not found' 
      });
    }

    res.json({ 
      success: true, 
      data: parent 
    });

  } catch (error) {
    next(error);
  }
};

// Get student attendance data
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.params;

    // Verify the student belongs to this parent
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parent not found' 
      });
    }

    if (!parent.studentIds.includes(studentId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this student' 
      });
    }

    // Get student details
    const student = await Student.findById(studentId)
      .populate('classId', 'name grade section');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get attendance records for the current academic year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const attendanceRecords = await AttendanceRecord.find({
      studentId: studentId,
      date: { $gte: startOfYear, $lte: endOfYear }
    }).sort({ date: -1 });

    // Calculate attendance statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(record => record.status === 'present').length;
    const absentDays = attendanceRecords.filter(record => record.status === 'absent').length;
    const lateDays = attendanceRecords.filter(record => record.status === 'late').length;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) : 0;

    // Get recent activity (last 5 records)
    const recentActivity = attendanceRecords.slice(0, 5).map(record => ({
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      notes: record.notes || '',
      timeIn: record.timeIn || null,
      timeOut: record.timeOut || null
    }));

    res.json({ 
      success: true, 
      data: {
        student: {
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          classId: student.classId,
          photoUrl: student.photoUrl
        },
        attendanceStats: {
          totalDays,
          present: presentDays,
          absent: absentDays,
          late: lateDays,
          attendanceRate: parseFloat(attendanceRate)
        },
        recentActivity
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update parent profile
exports.updateProfile = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { name, email } = req.body;

    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Parent not found' 
      });
    }

    if (name) parent.name = name;
    if (email) parent.email = email;

    await parent.save();

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: {
        _id: parent._id,
        name: parent.name,
        mobile: parent.mobile,
        email: parent.email,
        isDefaultPassword: parent.isDefaultPassword
      }
    });

  } catch (error) {
    next(error);
  }
};
