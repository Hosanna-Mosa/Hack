const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const Class = require('../models/Class');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_default_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn });
};

// Create a new teacher (admin flow)
const createTeacher = async (req, res, next) => {
  try {
    const { name, email, mobile, schoolId } = req.body;

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
      password: 'temp123',
      role: 'teacher',
      profile: {
        name,
        contact: { email, phone: mobile }
      }
    });

    await user.save();

    const teacher = new Teacher({ userId: user._id, schoolId, isActive: true });
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

// Delete teacher (soft delete, admin)
const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    teacher.isActive = false;
    await teacher.save();
    await User.findByIdAndUpdate(teacher.userId, { isActive: false });

    res.json({ success: true, message: 'Teacher deleted successfully' });
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
  changePassword
};
