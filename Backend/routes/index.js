const express = require('express');
const authRoutes = require('./auth');
const studentRoutes = require('./students');
const attendanceRoutes = require('./attendance');
const { health } = require('../controllers/healthController');

const router = express.Router();

// Health check
router.get('/health', health);

// API routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = router;
