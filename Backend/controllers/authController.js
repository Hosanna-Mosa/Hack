const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const Teacher = require('../models/Teacher');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_default_jwt_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn }
  );
};

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { username, password, role, profile, linkedTeacherId, linkedStudentIds, school } = req.body;

    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!normalizedUsername) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    // Prevent duplicates early and return a clear message
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Hash password explicitly and set `passwordHash` to satisfy schema validation
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = new User({
      username: normalizedUsername,
      passwordHash,
      role,
      profile: profile ? { ...profile, contact: { ...profile.contact, email: normalizedUsername } } : undefined,
      linkedTeacherId,
      linkedStudentIds
    });

    await user.save();

    // If school payload provided and role is admin, create school and assign admin
    if (school && role === 'admin') {
      const newSchool = new School({
        name: school.name,
        address: school.address,
        contactInfo: school.contactInfo,
        settings: school.settings,
        adminIds: [user._id]
      });
      await newSchool.save();
    }

    // If role is teacher, verify school identity by name and an email match
    if (role === 'teacher') {
      const schoolName = school?.name?.trim();
      const schoolEmail = school?.email?.trim().toLowerCase();
      if (!schoolName || !schoolEmail) {
        return res.status(400).json({ success: false, message: 'School name and email are required for teacher registration' });
      }

      const candidateSchool = await School.findOne({
        name: new RegExp(`^${schoolName}$`, 'i'),
        contactInfo: { $exists: true },
        isActive: true
      });

      const emails = candidateSchool?.contactInfo?.email || [];
      const match = Array.isArray(emails) && emails.map(e => String(e).toLowerCase()).includes(schoolEmail);
      if (!candidateSchool || !match) {
        return res.status(404).json({ success: false, message: 'School details did not match our records' });
      }

      const teacher = new Teacher({ userId: user._id, schoolId: candidateSchool._id });
      await teacher.save();
    }

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

// Login existing user
exports.login = async (req, res, next) => {
  try {
    

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    // Attach schoolId for convenience on frontend
    let schoolId = null;
    if (user.role === 'admin') {
      const school = await School.findOne({ adminIds: user._id }).select('_id');
      schoolId = school?._id || null;
    } else if (user.role === 'teacher') {
      const teacher = await (await require('../models/Teacher').findOne({ userId: user._id }).select('schoolId'));
      schoolId = teacher?.schoolId || null;
    }

    res.json({ success: true, token, user: { ...user.toJSON(), schoolId } });
  } catch (error) {
    next(error);
  }
};

// Get current authenticated user (augmented with schoolId)
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let schoolId = null;
    if (user?.role === 'admin') {
      const school = await School.findOne({ adminIds: user._id }).select('_id');
      schoolId = school?._id || null;
    } else if (user?.role === 'teacher') {
      const teacher = await (await require('../models/Teacher').findOne({ userId: user._id }).select('schoolId'));
      schoolId = teacher?.schoolId || null;
    }
    res.json({ success: true, user: { ...user.toJSON(), schoolId } });
  } catch (err) {
    next(err);
  }
};

