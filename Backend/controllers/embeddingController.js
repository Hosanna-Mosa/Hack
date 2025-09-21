// controllers/faceController.js

const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const path = require('path');

// Patch face-api with node-canvas
const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Models path
const MODEL_PATH = path.resolve(__dirname, '../models');
console.log('[face-api] MODEL PATH at startup:', MODEL_PATH);

// Load face-api models
async function loadModels() {
  console.log('[face-api] Loading models from:', MODEL_PATH);
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    console.log('[face-api] Models loaded successfully ✅');
  } catch (err) {
    console.error('[face-api] ❌ Model loading failed', err);
  }
}

// Get face descriptor
async function getFaceDescriptor(img) {
  console.log('[getFaceDescriptor] Detecting face...');
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    console.error('[getFaceDescriptor] ❌ No face detected in image');
    throw new Error('No face detected in image');
  }

  console.log('[getFaceDescriptor] ✅ Face detected');
  return detection.descriptor;
}

// Main controller for embedding
async function upsertImageEmbedding(req, res) {
  try {
    console.log('======================');
    console.log('[upsertImageEmbedding] Incoming request...');
    console.log('req.file?.buffer length:', req.file?.buffer?.length);
    console.log('req.body.imageBase64 length:', req.body?.imageBase64?.length);
    console.log('req.body.imagePath:', req.body?.imagePath);

    let img;

    if (req.file && req.file.buffer) {
      console.log('[upsertImageEmbedding] Using uploaded file buffer');
      img = await loadImage(req.file.buffer).catch(err => {
        console.error('[loadImage buffer error]', err);
        return null;
      });
    } else if (req.body.imageBase64) {
      console.log('[upsertImageEmbedding] Using Base64 image');
      const data = Buffer.from(req.body.imageBase64, 'base64');
      console.log('Decoded base64 size:', data.length);
      img = await loadImage(data).catch(err => {
        console.error('[loadImage base64 error]', err);
        return null;
      });
    } else if (req.body.imagePath) {
      console.log('[upsertImageEmbedding] Using imagePath:', req.body.imagePath);
      img = await loadImage(req.body.imagePath).catch(err => {
        console.error('[loadImage path error]', err);
        return null;
      });
    } else {
      console.error('[upsertImageEmbedding] ❌ No image provided');
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!img) {
      console.error('[upsertImageEmbedding] ❌ Image not loaded');
      return res.status(400).json({ error: 'Image not loaded' });
    }

    console.log('[upsertImageEmbedding] ✅ Image loaded, proceeding to face detection...');
    const descriptor = await getFaceDescriptor(img);
    console.log('[upsertImageEmbedding] Descriptor length:', descriptor?.length);

    return res.json({ message: 'Embedding created', descriptor });
  } catch (err) {
    console.error('[upsertImageEmbedding] ❌ Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { loadModels, upsertImageEmbedding };
