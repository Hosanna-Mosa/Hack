const express = require('express');
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const { handleValidationErrors: validate } = require('../middleware/validation');
const ClassModel = require('../models/Class');
const Teacher = require('../models/Teacher');
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

module.exports = router;
