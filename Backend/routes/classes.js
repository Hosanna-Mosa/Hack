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
			.populate({ path: 'teacherIds', populate: { path: 'user', select: 'profile.name profile.contact.email' } })
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

	// GET /api/classes/:id/students - Get all students in a specific class
	router.get('/:id/students', [
		auth,
		param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid class ID is required'),
		validate
	], async (req, res, next) => {
		try {
			const classId = req.params.id;

			// First verify the class exists
			const classData = await ClassModel.findById(classId);
			if (!classData) {
				return res.status(404).json({ success: false, message: 'Class not found' });
			}

			// Get all students in this class
			const students = await Student.find({
				classId: classId,
				isActive: true
			})
			.select('name academicInfo.admissionNumber contactInfo isActive')
			.sort({ 'academicInfo.admissionNumber': 1 });

			// Transform the data to match frontend expectations
			const transformedStudents = students.map((student) => ({
				id: student._id,
				name: student.name || 'Unknown Student',
				admissionNumber: student.academicInfo?.admissionNumber || 'N/A',
				email: student.contactInfo?.emergencyContact?.email || '',
				phone: student.contactInfo?.emergencyContact?.phone || '',
				status: 'unset'
			}));

			res.json({
				success: true,
				data: transformedStudents,
				classInfo: {
					id: classData._id,
					name: classData.name,
					grade: classData.grade,
					section: classData.section,
					totalStudents: transformedStudents.length
				}
			});
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

// PUT /api/classes/:id/teachers - Update teacher assignments for a class
router.put('/:id/teachers', [
	auth,
	param('id').custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Valid class id required'),
	body('teacherIds').isArray().withMessage('teacherIds array required'),
	validate
], async (req, res, next) => {
	try {
		const classId = req.params.id;
		const { teacherIds } = req.body;

		console.log('Updating teacher assignments for class:', classId);
		console.log('Teacher IDs to assign:', teacherIds);

		// Verify the class exists
		const classData = await ClassModel.findById(classId);
		if (!classData) {
			return res.status(404).json({ success: false, message: 'Class not found' });
		}

		console.log('Class found:', classData.name, 'Current teacherIds:', classData.teacherIds);

		// Verify all teacher IDs are valid
		if (teacherIds.length > 0) {
			const validTeachers = await Teacher.find({ 
				_id: { $in: teacherIds }, 
				schoolId: classData.schoolId,
				isActive: true 
			});
			
			if (validTeachers.length !== teacherIds.length) {
				return res.status(400).json({ 
					success: false, 
					message: 'One or more teacher IDs are invalid or inactive' 
				});
			}
		}

        // Determine changes vs previous state
        const previousTeacherIds = (classData.teacherIds || []).map((id) => String(id));
        const nextTeacherIds = (teacherIds || []).map((id) => String(id));

        const toAdd = nextTeacherIds.filter((id) => !previousTeacherIds.includes(id));
        const toRemove = previousTeacherIds.filter((id) => !nextTeacherIds.includes(id));

        // Update the class with new teacher assignments
        const updateResult = await ClassModel.updateOne({ _id: classId }, { $set: { teacherIds: nextTeacherIds } });
        console.log('Update result (class teacherIds):', updateResult, { toAdd, toRemove });

        // Sync Teacher.assignedClassIds for adds
        if (toAdd.length > 0) {
            const addRes = await Teacher.updateMany(
                { _id: { $in: toAdd } },
                { $addToSet: { assignedClassIds: classId } }
            );
            console.log('Updated Teacher.assignedClassIds (add):', addRes.modifiedCount);
        }

        // Sync Teacher.assignedClassIds for removals
        if (toRemove.length > 0) {
            const removeRes = await Teacher.updateMany(
                { _id: { $in: toRemove } },
                { $pull: { assignedClassIds: classId } }
            );
            console.log('Updated Teacher.assignedClassIds (remove):', removeRes.modifiedCount);
        }

		// Get the updated class with populated teacher data
        const updatedClass = await ClassModel.findById(classId)
            .populate('teacherIds', 'name email');
		
		console.log('Updated class:', updatedClass.name, 'New teacherIds:', updatedClass.teacherIds);

		res.json({ success: true, data: updatedClass });
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
