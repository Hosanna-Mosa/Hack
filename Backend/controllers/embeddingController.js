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
sync function getFaceDescriptor(img) {
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

// Normalize vector to unit length
function normalizeVector(v) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map(x => x / (norm || 1));
}

// Euclidean distance with normalized vectors
function euclideanDistanceNormalized(a, b) {
  const normA = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const normB = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] / normA) - (b[i] / normB);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
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

// Compare input face with stored embeddings
exports.compareImage = async (req, res, next) => {
  try {
    const { sourceType = 'student-face', sourceId, verbose } = req.body;
    const threshold = 0.25; // ✅ tuned threshold from your observation

    if (!req.file && !req.body.imageBase64 && !req.body.imagePath) {
      return res.status(400).json({ success: false, message: 'Provide image via multipart file, imageBase64, or imagePath' });
    }

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    const queryVector = normalizeVector(await getFaceDescriptor(img));

    const filter = sourceId ? { sourceType, sourceId: String(sourceId) } : { sourceType };
    const all = await Embedding.find(filter).lean();

    console.log(`[compareImage] Comparing query vector against ${all.length} embeddings`);

    const scored = all.map(d => {
      const dist = euclideanDistanceNormalized(queryVector, d.vector);
      console.log(`[compareImage] Candidate sourceId=${d.sourceId}, distance=${dist.toFixed(4)}`);
      return { doc: d, distance: dist };
    });

    scored.sort((a, b) => a.distance - b.distance);
    const best = scored[0] || null;
    const matched = Boolean(best && best.distance <= threshold);

    console.log(`[compareImage] Best match sourceId=${best?.doc?.sourceId}, distance=${best?.distance?.toFixed(4)}, matched=${matched}`);

    const response = {
      matched,
      threshold,
      bestMatch: best ? { sourceId: best.doc.sourceId, distance: best.distance } : null
    };

    if (String(verbose) === 'true') {
      response.queryVector = queryVector;
      response.candidates = scored;
    }

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error('[compareImage] ERROR:', error.message);
    next(error);
  }
};

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
