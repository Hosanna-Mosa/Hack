const express = require('express');
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const ClassModel = require('../models/Class');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/classes?schoolId=...
router.get('/', [
	query('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
	validate
], async (req, res, next) => {
	try {
		const { schoolId } = req.query;
		const classes = await ClassModel.find({ schoolId })
			.populate({ path: 'teachers', populate: { path: 'user', select: 'profile.name profile.contact.email' } })
			.sort({ createdAt: -1 });
		res.json({ success: true, data: classes });
	} catch (err) {
		next(err);
	}
});

// GET /api/classes/teachers?schoolId=...
router.get('/teachers', [
	query('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
	validate
], async (req, res, next) => {
	try {
		const { schoolId } = req.query;
		const teachers = await Teacher.find({ schoolId, isActive: true }).populate('user', 'profile.name profile.contact.email');
		res.json({ success: true, data: teachers });
	} catch (err) {
		next(err);
	}
});

// POST /api/classes
router.post('/', [
	auth,
	body('name').notEmpty(),
	body('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
	body('grade').notEmpty(),
	body('section').notEmpty(),
	body('capacity').optional().isInt({ min: 1, max: 100 }),
	body('teacherIds').optional().isArray(),
	validate
], async (req, res, next) => {
	try {
		const payload = req.body;
		const created = await ClassModel.create(payload);
		const populated = await ClassModel.findById(created._id).populate('teachers', 'user');
		res.status(201).json({ success: true, data: populated });
	} catch (err) {
		next(err);
	}
});

// POST /api/classes/:id/assign-students
router.post('/:id/assign-students', [
    auth,
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid class id required'),
    body('studentIds').isArray({ min: 1 }).withMessage('studentIds array required'),
    validate
], async (req, res, next) => {
    try {
        const classId = req.params.id;
        const { studentIds } = req.body;
        // Assign class to students
        await Student.updateMany({ _id: { $in: studentIds } }, { $set: { classId } });
        // Add student ids to class (avoid duplicates)
        await ClassModel.updateOne({ _id: classId }, { $addToSet: { studentIds: { $each: studentIds } } });

        const updated = await Student.find({ _id: { $in: studentIds } }).select('_id name classId');
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
});


    validate
], async (req, res, next) => {
    try {
        const classId = req.params.id;
        const students = await Student.find({ classId }).select('_id name academicInfo.admissionNumber');
        res.json({ success: true, data: students });
    } catch (err) {
        next(err);
    }
});

// POST /api/classes/:id/remove-students
router.post('/:id/remove-students', [
    auth,
    param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid class id required'),
    body('studentIds').isArray({ min: 1 }).withMessage('studentIds array required'),
    validate
], async (req, res, next) => {
    try {
        const classId = req.params.id;
        const { studentIds } = req.body;
        // Unassign class from students
        await Student.updateMany({ _id: { $in: studentIds }, classId }, { $set: { classId: null } });
        // Pull student ids from class
        await ClassModel.updateOne({ _id: classId }, { $pull: { studentIds: { $in: studentIds } } });

        const updated = await Student.find({ _id: { $in: studentIds } }).select('_id name classId');
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
});

// GET /api/classes/unassigned-students?schoolId=...
router.get('/unassigned', [
    query('schoolId').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid schoolId is required'),
    validate
], async (req, res, next) => {
    try {
        const { schoolId } = req.query;
        const students = await Student.find({ schoolId, classId: null, isActive: true }).select('_id name academicInfo.admissionNumber');
        res.json({ success: true, data: students });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
