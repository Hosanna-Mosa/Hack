const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

// Register a new user
exports.register = async (req, res, next) => {
  try {
    console.log('[AUTH] /register payload:', {
      username: req.body?.username,
      role: req.body?.role,
      email: req.body?.profile?.contact?.email
    });
    const { username, password, role, profile, linkedTeacherId, linkedStudentIds } = req.body;

    // Pre-check for duplicate username/email to provide clearer error
    const existingUser = await User.findOne({
      $or: [
        { username },
        { 'profile.contact.email': profile?.contact?.email }
      ]
    });
    if (existingUser) {
      const duplicateField = existingUser.username === username ? 'username' : 'email';
      return res.status(409).json({ success: false, message: `${duplicateField} already exists` });
    }

    const user = new User({
      username,
      password,
      role,
      profile,
      linkedTeacherId,
      linkedStudentIds
    });

    await user.save();

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('[AUTH] /register error:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      keyValue: error?.keyValue,
      errors: error?.errors
    });
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

