const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { username, password, role, profile, linkedTeacherId, linkedStudentIds } = req.body;

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

