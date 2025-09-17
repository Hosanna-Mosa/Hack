const express = require('express');
const { auth } = require('../middleware/auth');
const School = require('../models/School');
const Teacher = require('../models/Teacher');

const router = express.Router();

// GET /api/schools/me - Get current user's school information
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = req.user;
    let school = null;

    if (user.role === 'admin') {
      // For admins, find school by adminIds
      school = await School.findOne({ adminIds: user._id }).select('name address contactInfo');
    } else if (user.role === 'teacher') {
      // For teachers, find school through teacher record
      const teacher = await Teacher.findOne({ userId: user._id }).select('schoolId');
      if (teacher?.schoolId) {
        school = await School.findById(teacher.schoolId).select('name address contactInfo');
      }
    }

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School information not found for this user' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        name: school.name,
        address: school.address,
        contactInfo: school.contactInfo
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
