const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const upload = multer();
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const controller = require('../controllers/embeddingController');

const router = express.Router();

// Upsert text embedding
// router.post('/text', [
//   body('sourceId').notEmpty().withMessage('sourceId is required'),
//   body('text').notEmpty().withMessage('text is required'),
//   handleValidationErrors
// ], auth, authorize('admin', 'teacher'), controller.upsertTextEmbedding);

// Upsert image embedding via multipart/form-data (file) or JSON base64/path
router.post('/image', upload.single('image'), [
  body('sourceId').notEmpty().withMessage('sourceId is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), controller.upsertImageEmbedding);

// Get an embedding by source
// router.get('/:sourceType/:sourceId', [
//   param('sourceType').isString().notEmpty(),
//   param('sourceId').isString().notEmpty(),
//   handleValidationErrors
// ], auth, controller.getEmbeddingBySource);

// Search by cosine similarity
// router.post('/search', [
//   body('vector').isArray({ min: 1 }).withMessage('vector is required'),
//   body('topK').optional().isInt({ min: 1, max: 100 }),
//   handleValidationErrors
// ], auth, controller.searchByCosineSimilarity);

// Compare an input image to stored embeddings
router.post('/compare', upload.single('image'), [
  body('threshold').optional().isFloat({ min: 0, max: 1 }),
  body('sourceId').optional().isString(),
  handleValidationErrors
], auth, controller.compareImage);

// Compare two stored embeddings by sourceId
router.post('/compare-stored', [
  body('sourceIdA').isString().notEmpty(),
  body('sourceIdB').isString().notEmpty(),
  body('threshold').optional().isFloat({ min: 0, max: 1 }),
  handleValidationErrors
], auth, controller.compareStored);

// Upsert multiple face embeddings from a single image
router.post('/multiple', upload.single('image'), [
  body('sourceId').notEmpty().withMessage('sourceId is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), controller.upsertMultipleEmbeddings);

// Compare multiple faces in input image with stored embeddings
router.post('/compare-multiple', upload.single('image'), [
  body('threshold').optional().isFloat({ min: 0, max: 1 }),
  handleValidationErrors
], auth, controller.compareMultiple);

module.exports = router;


