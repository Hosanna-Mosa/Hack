# TensorFlow Disable Guide

This guide provides step-by-step instructions to temporarily disable TensorFlow dependencies for development purposes when you encounter node modules installation issues.

## Quick Disable Process

### 1. Comment Out TensorFlow Dependencies in `Backend/package.json`

**File**: `Backend/package.json`

**Change this**:
```json
"dependencies": {
  "@tensorflow/tfjs": "^4.22.0",
  "@tensorflow/tfjs-backend-cpu": "^4.22.0",
  "@tensorflow/tfjs-converter": "^4.22.0",
  "@tensorflow/tfjs-core": "^4.22.0",
  "@tensorflow/tfjs-node": "^4.22.0",
  "@vladmandic/face-api": "^1.7.15",
  "bcryptjs": "^2.4.3",
  "canvas": "^3.2.0",
  "compression": "^1.7.4",
  "cors": "^2.8.5",
  "dotenv": "^16.6.1",
  "express": "^4.18.2",
  "express-validator": "^7.0.1",
  "face-api.js": "^0.22.2",
  "helmet": "^7.1.0",
  "image-js": "^1.0.0",
  "jpeg-js": "^0.4.4",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.0.3",
  "morgan": "^1.10.0",
  "multer": "^2.0.2",
  "pngjs": "^7.0.0"
}
```

**To this**:
```json
"dependencies": {
  "bcryptjs": "^2.4.3",
  "compression": "^1.7.4",
  "cors": "^2.8.5",
  "dotenv": "^16.6.1",
  "express": "^4.18.2",
  "express-validator": "^7.0.1",
  "helmet": "^7.1.0",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.0.3",
  "morgan": "^1.10.0",
  "multer": "^2.0.2"
}
```

### 2. Comment Out Embedding Routes in `Backend/routes/index.js`

**File**: `Backend/routes/index.js`

**Change this**:
```javascript
router.use('/embeddings', require('./embeddings'));
```

**To this**:
```javascript
// router.use('/embeddings', require('./embeddings'));
```

### 3. Comment Out All Routes in `Backend/routes/embeddings.js`

**File**: `Backend/routes/embeddings.js`

**Change these three route definitions**:

```javascript
// Upsert image embedding via multipart/form-data (file) or JSON base64/path
router.post('/image', upload.single('image'), [
  body('sourceId').notEmpty().withMessage('sourceId is required'),
  handleValidationErrors
], auth, authorize('admin', 'teacher'), controller.upsertImageEmbedding);

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
```

**To this**:
```javascript
// Upsert image embedding via multipart/form-data (file) or JSON base64/path
// router.post('/image', upload.single('image'), [
//   body('sourceId').notEmpty().withMessage('sourceId is required'),
//   handleValidationErrors
// ], auth, authorize('admin', 'teacher'), controller.upsertImageEmbedding);

// Compare an input image to stored embeddings
// router.post('/compare', upload.single('image'), [
//   body('threshold').optional().isFloat({ min: 0, max: 1 }),
//   body('sourceId').optional().isString(),
//   handleValidationErrors
// ], auth, controller.compareImage);

// Compare two stored embeddings by sourceId
// router.post('/compare-stored', [
//   body('sourceIdA').isString().notEmpty(),
//   body('sourceIdB').isString().notEmpty(),
//   body('threshold').optional().isFloat({ min: 0, max: 1 }),
//   handleValidationErrors
// ], auth, controller.compareStored);
```

### 4. Comment Out TensorFlow Code in `Backend/scripts/embed.js`

**File**: `Backend/scripts/embed.js`

**Change this**:
```javascript
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
  console.log('Using @tensorflow/tfjs-node backend');
} catch (err) {
  tf = require('@tensorflow/tfjs');
  console.log('Falling back to @tensorflow/tfjs (pure JS) backend');
}
const use = require('@tensorflow-models/universal-sentence-encoder');
```

**To this**:
```javascript
// let tf;
// try {
//   tf = require('@tensorflow/tfjs-node');
//   console.log('Using @tensorflow/tfjs-node backend');
// } catch (err) {
//   tf = require('@tensorflow/tfjs');
//   console.log('Falling back to @tensorflow/tfjs (pure JS) backend');
// }
// const use = require('@tensorflow-models/universal-sentence-encoder');
```

**And change this**:
```javascript
console.log('Loading embedding model...');
const model = await use.load();
console.log('Generating embedding...');

const embeddingTensor = await model.embed([text]);
const embeddingArray2D = await embeddingTensor.array();
const vector = embeddingArray2D[0];
embeddingTensor.dispose();
```

**To this**:
```javascript
// console.log('Loading embedding model...');
// const model = await use.load();
// console.log('Generating embedding...');

// const embeddingTensor = await model.embed([text]);
// const embeddingArray2D = await embeddingTensor.array();
// const vector = embeddingArray2D[0];
// embeddingTensor.dispose();

console.log('TensorFlow functionality disabled - returning dummy vector');
const vector = new Array(512).fill(0); // Dummy vector
```

### 5. Comment Out TensorFlow Code in `Backend/scripts/embed-image.js`

**File**: `Backend/scripts/embed-image.js`

**Change this**:
```javascript
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
  console.log('Using @tensorflow/tfjs-node backend');
} catch (err) {
  tf = require('@tensorflow/tfjs');
  console.log('Falling back to @tensorflow/tfjs (pure JS) backend');
}
const mobilenet = require('@tensorflow-models/mobilenet');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
```

**To this**:
```javascript
// let tf;
// try {
//   tf = require('@tensorflow/tfjs-node');
//   console.log('Using @tensorflow/tfjs-node backend');
// } catch (err) {
//   tf = require('@tensorflow/tfjs');
//   console.log('Falling back to @tensorflow/tfjs (pure JS) backend');
// }
// const mobilenet = require('@tensorflow-models/mobilenet');
// const jpeg = require('jpeg-js');
// const { PNG } = require('pngjs');
```

**And change this**:
```javascript
async function loadImageAsTensor(imagePath) {
  // ... entire function body
}
```

**To this**:
```javascript
// async function loadImageAsTensor(imagePath) {
//   // ... entire function body
// }
```

**And change this**:
```javascript
console.log('Loading MobileNet model...');
const model = await mobilenet.load({ version: 2, alpha: 1.0 });

console.log('Loading image...');
const input = await loadImageAsTensor(file);

console.log('Extracting embedding...');
// Use intermediate activations to get a feature vector
const features = model.infer(input, { embedding: true });
const vector = Array.from(await features.data());
input.dispose();
features.dispose();
```

**To this**:
```javascript
// console.log('Loading MobileNet model...');
// const model = await mobilenet.load({ version: 2, alpha: 1.0 });

// console.log('Loading image...');
// const input = await loadImageAsTensor(file);

// console.log('Extracting embedding...');
// // Use intermediate activations to get a feature vector
// const features = model.infer(input, { embedding: true });
// const vector = Array.from(await features.data());
// input.dispose();
// features.dispose();

console.log('TensorFlow functionality disabled - returning dummy vector');
const vector = new Array(1000).fill(0); // Dummy vector
```

## Re-enable Process (For GitHub Push)

To restore full TensorFlow functionality before pushing to GitHub, simply reverse all the above changes:

1. **Uncomment all dependencies** in `package.json`
2. **Uncomment the embedding route** in `routes/index.js`
3. **Uncomment all three routes** in `routes/embeddings.js`
4. **Uncomment all TensorFlow code** in both script files
5. **Remove dummy vector generation** and restore original functionality

## Files Modified

- `Backend/package.json`
- `Backend/routes/index.js`
- `Backend/routes/embeddings.js`
- `Backend/scripts/embed.js`
- `Backend/scripts/embed-image.js`

## Notes

- The `controllers/embeddingController.js` file is **NOT modified** - it remains intact
- All safe area fixes in the mobile app remain unaffected
- This process only disables TensorFlow functionality temporarily for development
- The backend will work normally for all other features (auth, students, classes, attendance, etc.)

## Quick Commands

After making changes, run:
```bash
cd Backend
npm install
npm start
```

This should install dependencies without TensorFlow-related errors and start the backend successfully.
