const express = require('express');
const authRoutes = require('./auth');
const studentRoutes = require('./students');
const attendanceRoutes = require('./attendance');
const classRoutes = require('./classes');
const parentRoutes = require('./parents');
const schoolRoutes = require('./schools');
const teacherRoutes = require('./teachers');
const activityController = require('../controllers/activityController');
const { health } = require('../controllers/healthController');

const router = express.Router();

// Health check
router.get("/health", health);

// API routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/classes', classRoutes);
router.use('/parents', parentRoutes);
router.use('/schools', schoolRoutes);
router.use('/teachers', teacherRoutes);

// Recent activity (auth required)
const { auth } = require('../middleware/auth');
router.get('/activity/recent', auth, activityController.getRecentActivity);
router.use('/embeddings', require('./embeddings'));

module.exports = router;
