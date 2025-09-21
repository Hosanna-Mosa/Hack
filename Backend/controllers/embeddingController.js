const path = require('path');
const fs = require('fs');
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (err) {
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

// Load models once at startup
const MODEL_PATH = path.join(__dirname, '../models');
async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
  console.log('[face-api] Models loaded from', MODEL_PATH);
}
loadModels();

// Utility to load image from buffer/base64/path
async function loadImage(buffer, base64, imagePath) {
  let data;
  if (buffer) {
    data = buffer;
  } else if (base64) {
    const b64 = base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    data = Buffer.from(b64, 'base64');
  } else if (imagePath) {
    const absolute = path.resolve(process.cwd(), imagePath);
    data = fs.readFileSync(absolute);
  }
  return await canvas.loadImage(data);
}

// Extract face descriptor (128-d embedding) from image
async function getFaceDescriptor(img) {
  if(!img) console.log("img is not found");
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()

// ---------- CONTROLLERS ----------

// Insert/Update text embedding
exports.upsertTextEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'text', text, metadata } = req.body;
    
    if (!sourceId || !text) {
      return res.status(400).json({ 
        success: false, 
        message: 'sourceId and text are required' 
      });
    }

    console.log('[upsertTextEmbedding] Starting process for sourceId=', sourceId);

    // For text embeddings, we'll create a simple hash-based vector
    // In a real implementation, you might use a text embedding model
    const textHash = require('crypto')
      .createHash('sha256')
      .update(text)
      .digest('hex');
    
    // Convert hash to a 128-dimensional vector (similar to face embeddings)
    const vector = [];
    for (let i = 0; i < 128; i++) {
      const byte1 = parseInt(textHash.substr((i * 2) % 64, 2), 16);
      const byte2 = parseInt(textHash.substr(((i * 2) + 1) % 64, 2), 16);
      vector.push((byte1 - 128) / 128 + (byte2 - 128) / 128);
    }

    // Normalize the vector
    const normalizedVector = normalizeVector(vector);

    console.log('[upsertTextEmbedding] Text vector generated. Length=', normalizedVector.length);

    const payload = { 
      sourceId, 
      sourceType, 
      text, 
      vector: normalizedVector, 
      metadata 
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
        text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      } 
    });
  } catch (error) {
    console.error('[upsertTextEmbedding] ERROR:', error.message);
    next(error);
  }
};

// Insert/Update face embedding
exports.upsertImageEmbedding = async (req, res, next) => {
  try {

    console.log('[upsertImageEmbedding] Starting process for sourceId=', sourceId);

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    if(!img) console.log('[upsertImageEmbedding] Image not loaded');
    else console.log('[upsertImageEmbedding] Image loaded');
    console.log('[upsertImageEmbedding] Image loaded');

    let vector = await getFaceDescriptor(img);
    vector = normalizeVector(vector); // ✅ normalize before saving

// Compare two stored face embeddings
exports.compareStored = async (req, res, next) => {
  try {
    const { sourceIdA, sourceIdB, sourceType = 'student-face', verbose } = req.body;
    const threshold = 0.25; // ✅ tuned threshold from your observation

    if (!sourceIdA || !sourceIdB) {
      return res.status(400).json({ success: false, message: 'sourceIdA and sourceIdB are required' });
    }

    const [a, b] = await Promise.all([
      Embedding.findOne({ sourceId: sourceIdA, sourceType }),
      Embedding.findOne({ sourceId: sourceIdB, sourceType }),
    ]);
    if (!a || !b) {
      return res.status(404).json({ success: false, message: 'One or both embeddings not found' });
    }

    const distance = euclideanDistanceNormalized(a.vector, b.vector);
    const matched = distance <= threshold;

    console.log(`[compareStored] A=${a.sourceId}, B=${b.sourceId}, distance=${distance.toFixed(4)}, matched=${matched}`);

    const payload = {
      matched,
      threshold,
      distance,
      a: { id: a._id, sourceId: a.sourceId },
      b: { id: b._id, sourceId: b.sourceId }
    };

    if (String(verbose) === 'true') {
      payload.a.vector = a.vector;
      payload.b.vector = b.vector;
    }

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('[compareStored] ERROR:', error.message);
    next(error);
  }
};
