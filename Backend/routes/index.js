const express = require('express');
const authRoutes = require('./auth');
const studentRoutes = require('./students');
const attendanceRoutes = require('./attendance');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = router;
