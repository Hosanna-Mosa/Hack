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

// ---------- FACE DESCRIPTORS ----------

// Single face
async function getFaceDescriptor(img) {
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) throw new Error('No face detected in image');
  return Array.from(detection.descriptor);
}

// Multiple faces
async function getFaceDescriptors(img) {
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!detections || detections.length === 0) {
    throw new Error('No faces detected in image');
  }
  console.log("face found in image", detections.length);
  
  return detections.map(d => Array.from(d.descriptor));
}

// ---------- VECTOR UTILS ----------

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

// ---------- CONTROLLERS (SINGLE FACE) ----------

// Insert/Update face embedding
exports.upsertImageEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'student-face', metadata, filename } = req.body;
    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }
    if (!req.file && !req.body.imageBase64 && !req.body.imagePath) {
      return res.status(400).json({ success: false, message: 'Provide image via multipart file, imageBase64, or imagePath' });
    }

    console.log('[upsertImageEmbedding] Starting process for sourceId=', sourceId);

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    console.log('[upsertImageEmbedding] Image loaded');

    let vector = await getFaceDescriptor(img);
    vector = normalizeVector(vector); // ✅ normalize before saving

    console.log('[upsertImageEmbedding] Normalized descriptor extracted. Length=', vector.length);

    const text = filename || req.body.imagePath || 'uploaded-face';
    const payload = { sourceId, sourceType, text, vector, metadata };

    const doc = await Embedding.findOneAndUpdate(
      { sourceId, sourceType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('[upsertImageEmbedding] Embedding saved in DB. _id=', doc._id);

    if (sourceType === 'student-face' && sourceId) {
      try {
        await Student.findByIdAndUpdate(sourceId, { faceEmbedding: doc._id.toString() });
        console.log(`[upsertImageEmbedding] Updated student ${sourceId} with face embedding ID: ${doc._id}`);
      } catch (err) {
        console.error(`[upsertImageEmbedding] Failed to update student ${sourceId}:`, err.message);
      }
    }

    res.status(201).json({ success: true, data: { id: doc._id, dims: vector.length } });
  } catch (error) {
    console.error('[upsertImageEmbedding] ERROR:', error.message);
    next(error);
  }
};

// Compare input face with stored embeddings
exports.compareImage = async (req, res, next) => {
  try {
    const { sourceType = 'student-face', sourceId, verbose } = req.body;
    const threshold = 0.3; // ✅ tuned threshold

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
      return { doc: d, distance: dist };
    });

    scored.sort((a, b) => a.distance - b.distance);
    const best = scored[0] || null;
    const matched = Boolean(best && best.distance <= threshold);

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
    const threshold = 0.3;

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

// ---------- CONTROLLERS (MULTIPLE FACES) ----------

// Insert/Update embeddings for multiple faces
exports.upsertMultipleEmbeddings = async (req, res, next) => {
  try {
    console.log('[upsertMultipleEmbeddings] Processing request');
    const { sourceId, sourceType = 'student-face', metadata, filename } = req.body;
    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }
    if (!req.file && !req.body.imageBase64 && !req.body.imagePath) {
      return res.status(400).json({ success: false, message: 'Provide image via multipart file, imageBase64, or imagePath' });
    }

    console.log('[upsertMultipleEmbeddings] Processing sourceId=', sourceId);

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    const descriptors = await getFaceDescriptors(img);

    console.log(`[upsertMultipleEmbeddings] Found ${descriptors.length} faces`);

    const text = filename || req.body.imagePath || 'uploaded-faces';
    const docs = [];

    for (let i = 0; i < descriptors.length; i++) {
      const vector = normalizeVector(descriptors[i]);
      const payload = { 
        sourceId: `${sourceId}_face${i+1}`, 
        sourceType, 
        text: `${text}_face${i+1}`, 
        vector, 
        metadata 
      };

      const doc = await Embedding.findOneAndUpdate(
        { sourceId: payload.sourceId, sourceType },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      docs.push(doc);

      if (sourceType === 'student-face' && sourceId) {
        try {
          await Student.findByIdAndUpdate(sourceId, { $addToSet: { faceEmbeddings: doc._id.toString() } });
        } catch (err) {
          console.error(`[upsertMultipleEmbeddings] Failed to update student ${sourceId}:`, err.message);
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      data: { count: docs.length, ids: docs.map(d => d._id), dims: descriptors[0].length } 
    });
  } catch (error) {
    console.error('[upsertMultipleEmbeddings] ERROR:', error.message);
    next(error);
  }
};

// Compare multiple faces in input image with stored embeddings
exports.compareMultiple = async (req, res, next) => {
  try {
    const { sourceType = 'student-face', verbose } = req.body;
    const threshold = 0.3;

    if (!req.file && !req.body.imageBase64 && !req.body.imagePath) {
      return res.status(400).json({ success: false, message: 'Provide image via multipart file, imageBase64, or imagePath' });
    }

    const img = await loadImage(req.file?.buffer, req.body.imageBase64, req.body.imagePath);
    const queryVectors = await getFaceDescriptors(img);
    const normalizedQueries = queryVectors.map(v => normalizeVector(v));

    console.log(`[compareMultiple] Found ${normalizedQueries.length} faces in query image`);

    const all = await Embedding.find({ sourceType }).lean();

    const matchedStudentIds = new Set(); // Use Set to avoid duplicates
    const detailedResults = [];

    normalizedQueries.forEach((qv, idx) => {
      const scored = all.map(d => ({
        doc: d,
        distance: euclideanDistanceNormalized(qv, d.vector)
      }));
      scored.sort((a, b) => a.distance - b.distance);
      const best = scored[0] || null;
      const matched = Boolean(best && best.distance <= threshold);

      if (matched && best) {
        matchedStudentIds.add(best.doc.sourceId);
      }

      // Keep detailed results for verbose mode
      if (String(verbose) === 'true') {
        const result = {
          faceIndex: idx+1,
          matched,
          threshold,
          bestMatch: best ? { sourceId: best.doc.sourceId, distance: best.distance } : null,
          queryVector: qv,
          candidates: scored
        };
        detailedResults.push(result);
      }
    });

    const response = {
      success: true,
      data: {
        totalFaces: normalizedQueries.length,
        matchedCount: matchedStudentIds.size,
        matchedStudentIds: Array.from(matchedStudentIds)
      }
    };

    // Add detailed results if verbose mode is enabled
    if (String(verbose) === 'true') {
      response.data.detailedResults = detailedResults;
    }

    return res.json(response);
  } catch (error) {
    console.error('[compareMultiple] ERROR:', error.message);
    next(error);
  }
};
