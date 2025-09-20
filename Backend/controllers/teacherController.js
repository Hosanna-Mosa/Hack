const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const Class = require('../models/Class');
const AttendanceRecord = require('../models/AttendanceRecord');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_default_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn });
};

// Create a new teacher (admin flow)
const createTeacher = async (req, res, next) => {
  try {
    const { name, email, mobile, schoolId } = req.body;
    const DEFAULT_TEACHER_PASSWORD = 'Teacher@123';
    console.log('CreateTeacher request body:', { name, email, mobile, schoolId });

    const existingUser = await User.findOne({ 'profile.contact.email': email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(400).json({ success: false, message: 'School not found' });
    }

    const username = email.split('@')[0] + '_' + Date.now();

    const user = new User({
      username,
      role: 'teacher',
      profile: {
        name,
        contact: { email, phone: mobile }
      }
    });
    // Ensure required passwordHash is present before validation
    user.password = 'temp123';
    user.passwordHash = await bcrypt.hash('temp123', 12);
    await user.save();

    // Create teacher record with provided phone number and default password
    const normalizedPhone = (mobile || '').replace(/[\s\-\(\)]/g, '');
    const teacher = new Teacher({
      userId: user._id,
      schoolId,
      isActive: true,
      phoneNumber: normalizedPhone,
      password: DEFAULT_TEACHER_PASSWORD
    });
    await teacher.save();

    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name');

    res.status(201).json({ success: true, message: 'Teacher created successfully', data: populatedTeacher });
  } catch (error) {
    next(error);
  }
};

// Get all teachers for a school (admin/teacher)
const getTeachers = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    const teachers = await Teacher.find({ schoolId, isActive: true })
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
};

// Update teacher (admin)
const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, mobile } = req.body;

    const teacher = await Teacher.findById(id).populate('user');
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    await User.findByIdAndUpdate(teacher.userId, {
      'profile.name': name,
      'profile.contact.email': email,
      'profile.contact.phone': mobile
    });

    const updatedTeacher = await Teacher.findById(id)
      .populate('user', 'profile.name profile.contact.email profile.contact.phone')
      .populate('school', 'name');

    res.json({ success: true, message: 'Teacher updated successfully', data: updatedTeacher });
  } catch (error) {
    next(error);
  }
};

// Delete teacher
// By default performs a soft delete (sets isActive=false on Teacher and User)
// Pass query hard=true to permanently remove Teacher and linked User and pull from classes
const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hard } = req.query || {};
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const isHardDelete = String(hard).toLowerCase() === 'true';

    if (!isHardDelete) {
      // Soft delete
      teacher.isActive = false;
      await teacher.save();
      await User.findByIdAndUpdate(teacher.userId, { isActive: false });
      return res.json({ success: true, message: 'Teacher soft-deleted successfully' });
    }

    // Hard delete: remove teacher, unlink from classes, and delete linked user
    const userId = teacher.userId;

    // Pull from any classes' teacherIds
    await Class.updateMany({ teacherIds: id }, { $pull: { teacherIds: id } });

    // Remove teacher document
    await Teacher.deleteOne({ _id: id });

    // Remove user document (optional if you want to keep User record; here we remove)
    await User.deleteOne({ _id: userId });

    res.json({ success: true, message: 'Teacher hard-deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Teacher login with phone number or email
const teacherLogin = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ success: false, message: 'Phone number and password are required' });
    }

    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    const teacherResult = await Teacher.aggregate([
      { $match: { phoneNumber: normalizedPhone, isActive: true } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.role': 'teacher', 'user.isActive': true } },
      { $lookup: { from: 'schools', localField: 'schoolId', foreignField: '_id', as: 'school' } },
      { $lookup: { from: 'classes', localField: 'assignedClassIds', foreignField: '_id', as: 'assignedClasses' } },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } }
    ]);

    if (!teacherResult || teacherResult.length === 0) {
      const fallbackResult = await Teacher.aggregate([
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $match: {
            'user.role': 'teacher',
            'user.isActive': true,
            $or: [
              { 'user.profile.contact.phone': normalizedPhone },
              { 'user.username': phoneNumber },
              { 'user.profile.contact.email': phoneNumber.toLowerCase() }
            ]
          }
        },
        { $lookup: { from: 'schools', localField: 'schoolId', foreignField: '_id', as: 'school' } },
        { $lookup: { from: 'classes', localField: 'assignedClassIds', foreignField: '_id', as: 'assignedClasses' } },
        { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } }
      ]);

      if (!fallbackResult || fallbackResult.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
      }

      const teacherData = fallbackResult[0];
      const user = teacherData.user;
      if (!teacherData.password) {
        return res.status(401).json({ success: false, message: 'Teacher password not set. Please contact administrator.' });
      }

      const isMatch = await bcrypt.compare(password, teacherData.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
      }
      if (!teacherData.isActive) {
        return res.status(403).json({ success: false, message: 'Teacher account is deactivated' });
      }

      const token = signToken({ _id: user._id, role: user.role });
      const { passwordHash, ...userWithoutPassword } = user;
      const { password: teacherPassword, ...teacherWithoutPassword } = teacherData;

      return res.json({
        success: true,
        token,
        user: {
          ...userWithoutPassword,
          schoolId: teacherWithoutPassword.schoolId,
          school: teacherWithoutPassword.school,
          teacherProfile: {
            assignedClasses: teacherWithoutPassword.assignedClasses,
            employeeId: teacherWithoutPassword.metadata?.employeeId,
            department: teacherWithoutPassword.metadata?.department,
            subjects: teacherWithoutPassword.metadata?.subjects,
            joiningDate: teacherWithoutPassword.metadata?.joiningDate
          }
        }
      });
    }

    const teacherData = teacherResult[0];
    const user = teacherData.user;
    if (!teacherData.password) {
      return res.status(401).json({ success: false, message: 'Teacher password not set. Please contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, teacherData.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or password' });
    }
    if (!teacherData.isActive) {
      return res.status(403).json({ success: false, message: 'Teacher account is deactivated' });
    }

    const token = signToken({ _id: user._id, role: user.role });
    const { passwordHash, ...userWithoutPassword } = user;
    const { password: teacherPassword, ...teacherWithoutPassword } = teacherData;

    return res.json({
      success: true,
      token,
      user: {
        ...userWithoutPassword,
        schoolId: teacherWithoutPassword.schoolId,
        school: teacherWithoutPassword.school,
        teacherProfile: {
          assignedClasses: teacherWithoutPassword.assignedClasses,
          employeeId: teacherWithoutPassword.metadata?.employeeId,
          department: teacherWithoutPassword.metadata?.department,
          subjects: teacherWithoutPassword.metadata?.subjects,
          joiningDate: teacherWithoutPassword.metadata?.joiningDate
        }
      }
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    next(error);
  }
};

// Get teacher profile with detailed information
const getTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const teacher = await Teacher.findOne({ userId })
      .populate('schoolId', 'name address contactInfo settings')
      .populate('assignedClassIds', 'name grade section subject')
      .populate('userId', 'profile username role');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    res.json({ success: true, teacher: { ...teacher.toJSON(), user: teacher.userId } });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    next(error);
  }
};

// Get teacher's assigned classes
const getAssignedClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const teacher = await Teacher.findOne({ userId })
      .populate('assignedClassIds', 'name grade section subject studentCount')
      .populate('schoolId', 'name');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    res.json({ success: true, classes: teacher.assignedClassIds, school: teacher.schoolId });
  } catch (error) {
    console.error('Get assigned classes error:', error);
    next(error);
  }
};

// Update teacher profile (self)
const updateTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    delete updates.userId;
    delete updates.schoolId;
    delete updates._id;

    if (updates.phoneNumber) {
      const normalizedPhone = updates.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const existingTeacher = await Teacher.findOne({ phoneNumber: normalizedPhone, userId: { $ne: userId } });
      if (existingTeacher) {
        return res.status(400).json({ success: false, message: 'Phone number is already in use by another teacher' });
      }
      updates.phoneNumber = normalizedPhone;
      await User.findByIdAndUpdate(userId, { $set: { 'profile.contact.phone': normalizedPhone } });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('schoolId', 'name');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully', teacher });
  } catch (error) {
    console.error('Update teacher profile error:', error);
    next(error);
  }
};

// Get teacher dashboard data
const getTeacherDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const teacher = await Teacher.findOne({ userId })
      .populate('schoolId', 'name')
      .populate('assignedClassIds', 'name grade section');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const classStats = await Class.aggregate([
      { $match: { _id: { $in: teacher.assignedClassIds } } },
      { $group: { _id: null, totalClasses: { $sum: 1 }, totalStudents: { $sum: '$studentCount' } } }
    ]);

    const dashboardData = {
      teacher: {
        name: teacher.userId?.profile?.name,
        employeeId: teacher.metadata?.employeeId,
        department: teacher.metadata?.department,
        subjects: teacher.metadata?.subjects
      },
      school: teacher.schoolId,
      classes: teacher.assignedClassIds,
      statistics: classStats[0] || { totalClasses: 0, totalStudents: 0 }
    };

    res.json({ success: true, dashboard: dashboardData });
  } catch (error) {
    console.error('Get teacher dashboard error:', error);
    next(error);
  }
};

// Change teacher password
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    teacher.password = hashedNewPassword;
    await teacher.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    next(error);
  }
};

// Change password from default (for first-time login with default password)
const changePasswordFromDefault = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Check if the current password is a default password
    const defaultPasswords = ['Teacher@123', 'teacher123', 'password123'];
    let isDefaultPassword = false;

    for (const defaultPwd of defaultPasswords) {
      const isMatch = await bcrypt.compare(defaultPwd, teacher.password);
      if (isMatch) {
        isDefaultPassword = true;
        break;
      }
    }

    // Also check if password follows the pattern: last 6 digits + "123"
    if (!isDefaultPassword) {
      const phoneNumber = teacher.phoneNumber;
      if (phoneNumber && phoneNumber.length >= 6) {
        const lastSixDigits = phoneNumber.slice(-6);
        const phoneBasedPassword = `${lastSixDigits}123`;
        const isPhoneBasedMatch = await bcrypt.compare(phoneBasedPassword, teacher.password);
        if (isPhoneBasedMatch) {
          isDefaultPassword = true;
        }
      }
    }

    if (!isDefaultPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'This endpoint is only for changing default passwords. Please use the regular change password endpoint.' 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    teacher.password = hashedNewPassword;
    await teacher.save();

    res.json({ success: true, message: 'Password changed successfully from default' });
  } catch (error) {
    console.error('Change password from default error:', error);
    next(error);
  }
};

// Get teacher's classes with attendance status for today
const getClassesWithAttendanceStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find teacher and populate assigned classes
    const teacher = await Teacher.findOne({ userId })
      .populate('assignedClassIds', 'name grade section studentIds')
      .populate('schoolId', 'name');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (!teacher.assignedClassIds || teacher.assignedClassIds.length === 0) {
      return res.json({ success: true, data: [], message: 'No classes assigned to this teacher' });
    }

    // Get attendance records for today for all assigned classes
    const classIds = teacher.assignedClassIds.map(cls => cls._id);
    
    const attendanceData = await AttendanceRecord.aggregate([
      {
        $match: {
          classId: { $in: classIds },
          date: today
        }
      },
      {
        $group: {
          _id: '$classId',
          totalMarked: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          excused: {
            $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
          }
        }
      }
    ]);

    // Create a map for quick lookup of attendance data
    const attendanceMap = {};
    attendanceData.forEach(item => {
      attendanceMap[item._id.toString()] = item;
    });

    // Process each class and determine status
    const classesWithStatus = teacher.assignedClassIds.map(cls => {
      const studentCount = cls.studentIds ? cls.studentIds.length : 0;
      const attendance = attendanceMap[cls._id.toString()];
      
      let status = 'Absent Data';
      let statusColor = '#9CA3AF';
      let leftBarColor = '#9CA3AF';

      if (attendance) {
        const { totalMarked, present, absent, late, excused } = attendance;
        
        if (totalMarked === studentCount) {
          // All students marked
          if (present === studentCount) {
            status = 'Completed';
            statusColor = '#10B981';
            leftBarColor = '#10B981';
          } else if (absent > 0 || late > 0) {
            status = 'Completed';
            statusColor = '#10B981';
            leftBarColor = '#10B981';
          }
        } else if (totalMarked > 0) {
          // Partially marked
          status = 'Ongoing';
          statusColor = '#3B82F6';
          leftBarColor = '#3B82F6';
        } else {
          // No attendance marked yet
          status = 'Pending';
          statusColor = '#60A5FA';
          leftBarColor = '#60A5FA';
        }
      } else {
        // No attendance data for today
        const currentHour = new Date().getHours();
        if (currentHour >= 9) { // After 9 AM, consider it delayed
          status = 'Delayed';
          statusColor = '#F59E0B';
          leftBarColor = '#F59E0B';
        } else {
          status = 'Pending';
          statusColor = '#60A5FA';
          leftBarColor = '#60A5FA';
        }
      }

      return {
        id: cls._id,
        className: `${cls.grade} ${cls.name}`,
        studentCount,
        status,
        statusColor,
        leftBarColor,
        attendanceData: attendance || {
          totalMarked: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        }
      };
    });

    res.json({ 
      success: true, 
      data: classesWithStatus,
      date: today.toISOString().split('T')[0] // Return current date
    });

  } catch (error) {
    console.error('Get classes with attendance status error:', error);
    next(error);
  }
};

module.exports = {
  // Admin CRUD
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  // Teacher self-service
  teacherLogin,
  getTeacherProfile,
  getAssignedClasses,
  updateTeacherProfile,
  getTeacherDashboard,
  changePassword,
};
