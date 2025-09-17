const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const upload = multer();
const { auth, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const controller = require('../controllers/embeddingController');

const router = express.Router();

// Upsert text embedding
router.post('/text', [
  body('sourceId').notEmpty().withMessage('sourceId is required'),
  body('text').notEmpty().withMessage('text is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), controller.upsertTextEmbedding);

// Upsert image embedding via multipart/form-data (file) or JSON base64/path
router.post('/image', upload.single('image'), [
  body('sourceId').notEmpty().withMessage('sourceId is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), controller.upsertImageEmbedding);

// Get an embedding by source
router.get('/:sourceType/:sourceId', [
  param('sourceType').isString().notEmpty(),
  param('sourceId').isString().notEmpty(),
  handleValidationErrors
], auth, controller.getEmbeddingBySource);

// Search by cosine similarity
router.post('/search', [
  body('vector').isArray({ min: 1 }).withMessage('vector is required'),
  body('topK').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], auth, controller.searchByCosineSimilarity);

module.exports = router;


