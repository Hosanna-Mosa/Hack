const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');

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
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({ success: true, token, user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

// Get current authenticated user
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

