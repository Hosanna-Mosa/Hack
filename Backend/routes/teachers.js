const express = require('express');
const { body, param, query } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const teacherController = require('../controllers/teacherController');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/teachers?schoolId=...
// @access  Private (Admin, Teacher)
router.get('/', [
  query('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
  validate
], teacherController.getTeachers);

// POST /api/teachers
// @access  Private (Admin only)
router.post('/', [
  auth,
  authorize('admin'),
  body('name').notEmpty().withMessage('Teacher name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
  validate
], teacherController.createTeacher);

// PUT /api/teachers/:id
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  authorize('admin'),
  param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid teacher id is required'),
  body('name').optional().notEmpty().withMessage('Teacher name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().notEmpty().withMessage('Mobile number cannot be empty'),
  validate
], teacherController.updateTeacher);

// DELETE /api/teachers/:id
// @access  Private (Admin only)
router.delete('/:id', [
  auth,
  authorize('admin'),
  param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid teacher id is required'),
  validate
], teacherController.deleteTeacher);

module.exports = router;


