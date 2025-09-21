const path = require('path');
const fs = require('fs');
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
  console.log('[tensorflow] Using @tensorflow/tfjs-node ✅ (native bindings loaded)');
} catch (err) {
  console.warn('[tensorflow] @tensorflow/tfjs-node NOT available, falling back to @tensorflow/tfjs ❌');
  tf = require('@tensorflow/tfjs');
}

// ---- Monkey patch for Node.js v22 ----
const util = require('util');
if (!util.isNullOrUndefined) {
  util.isNullOrUndefined = (val) => val === null || val === undefined;
  console.log('[patch] Added util.isNullOrUndefined for Node 22 compatibility');
}

const canvas = require('canvas');
const faceapi = require('@vladmandic/face-api');
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const Embedding = require('../models/Embedding');
const Student = require('../models/Student');

// ---- Check node_modules presence ----
try {
  const tfPath = require.resolve('@tensorflow/tfjs-node');
  console.log('[check] Resolved tfjs-node path:', tfPath);
} catch (e) {
  console.warn('[check] @tensorflow/tfjs-node not found in node_modules');
}
try {
  const faceapiPath = require.resolve('@vladmandic/face-api');
  console.log('[check] Resolved face-api path:', faceapiPath);
} catch (e) {
  console.warn('[check] face-api not found in node_modules');
}

// Load models once at startup
const MODEL_PATH = path.join(__dirname, '../models');
async function loadModels() {
  console.log('[face-api] Loading models from', MODEL_PATH);
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    console.log('[face-api] Models loaded successfully ✅');
  } catch (err) {
    console.error('[face-api] ERROR loading models ❌:', err.message);
  }
}
loadModels();

// Utility to load image from buffer/base64/path
async function loadImage(buffer, base64, imagePath) {
  console.log('[loadImage] buffer?', !!buffer, 'base64?', !!base64, 'path?', !!imagePath);
  let data;
  if (buffer) {
    console.log('[loadImage] Buffer size =', buffer.length);
    data = buffer;
  } else if (base64) {
    console.log('[loadImage] Base64 length =', base64.length);
    const b64 = base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    data = Buffer.from(b64, 'base64');
  } else if (imagePath) {
    const absolute = path.resolve(process.cwd(), imagePath);
    console.log('[loadImage] Absolute path =', absolute);
    data = fs.readFileSync(absolute);
    console.log('[loadImage] File size =', data.length);
  }

  try {
    const img = await canvas.loadImage(data);
    console.log('[loadImage] Image loaded successfully ✅');
    return img;
  } catch (err) {
    console.error('[loadImage] ERROR loading image ❌:', err.message);
    return null;
  }
}

// Extract face descriptor (128-d embedding) from image
async function getFaceDescriptor(img) {
  if (!img) {
    console.error('[getFaceDescriptor] ERROR: img is null ❌');
    return null;
  }
  console.log('[getFaceDescriptor] Running face detection...');
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    console.error('[getFaceDescriptor] No face detected ❌');
    throw new Error('No face detected in image');
  }

  console.log('[getFaceDescriptor] Face detected ✅, descriptor length =', detection.descriptor.length);
  return detection.descriptor;
}

// ---------- CONTROLLERS ----------

// Insert/Update text embedding
exports.upsertTextEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'text', text, metadata } = req.body;

    if (!sourceId || !text) {
      return res.status(400).json({
        success: false,
        message: 'sourceId and text are required',
      });
    }

    console.log('[upsertTextEmbedding] Starting process for sourceId=', sourceId);

    const textHash = require('crypto')
      .createHash('sha256')
      .update(text)
      .digest('hex');

    const vector = [];
    for (let i = 0; i < 128; i++) {
      const byte1 = parseInt(textHash.substr((i * 2) % 64, 2), 16);
      const byte2 = parseInt(textHash.substr(((i * 2) + 1) % 64, 2), 16);
      vector.push((byte1 - 128) / 128 + (byte2 - 128) / 128);
    }

    const normalizedVector = normalizeVector(vector);

    console.log('[upsertTextEmbedding] Text vector generated. Length=', normalizedVector.length);

    const payload = {
      sourceId,
      sourceType,
      text,
      vector: normalizedVector,
      metadata,
    };

    const doc = await Embedding.findOneAndUpdate(
      { sourceId, sourceType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[upsertTextEmbedding] Embedding saved in DB. _id=', doc._id);

    res.status(201).json({
      success: true,
      data: {
        id: doc._id,
        dims: normalizedVector.length,
        sourceId,
        sourceType,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      },
    });
  } catch (error) {
    console.error('[upsertTextEmbedding] ERROR:', error.message);
    next(error);
  }
};

// Insert/Update face embedding
exports.upsertImageEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'student-face', metadata } = req.body;
    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }

    console.log('[upsertImageEmbedding] Starting process for sourceId=', sourceId);

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    if (!img) {
      console.error('[upsertImageEmbedding] Image not loaded ❌');
      return res.status(400).json({ success: false, message: 'Image not loaded' });
    }

    let vector = await getFaceDescriptor(img);
    if (!vector) {
      console.error('[upsertImageEmbedding] Failed to extract face descriptor ❌');
      return res.status(400).json({ success: false, message: 'No face detected' });
    }

    vector = normalizeVector(vector); 
    console.log('[upsertImageEmbedding] Face vector normalized. Length=', vector.length);

    const payload = { sourceId, sourceType, vector, metadata };

    const doc = await Embedding.findOneAndUpdate(
      { sourceId, sourceType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[upsertImageEmbedding] Embedding saved in DB. _id=', doc._id);

    res.status(201).json({
      success: true,
      data: { id: doc._id, dims: vector.length, sourceId, sourceType },
    });
  } catch (error) {
    console.error('[upsertImageEmbedding] ERROR:', error.message);
    next(error);
  }
};
