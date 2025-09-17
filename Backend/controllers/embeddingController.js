const path = require('path');
const fs = require('fs');
let tf;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (err) {
  tf = require('@tensorflow/tfjs');
}
const use = require('@tensorflow-models/universal-sentence-encoder');
const mobilenet = require('@tensorflow-models/mobilenet');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const Embedding = require('../models/Embedding');

async function loadImageAsTensorFromBuffer(buffer) {
  const sig = buffer.slice(0, 8).toString('hex');
  const isPng = sig.startsWith('89504e47');
  const isJpeg = sig.startsWith('ffd8');
  let width, height, pixelsRGBA;
  if (isJpeg) {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    width = decoded.width;
    height = decoded.height;
    pixelsRGBA = decoded.data;
  } else if (isPng) {
    const decoded = PNG.sync.read(buffer);
    width = decoded.width;
    height = decoded.height;
    pixelsRGBA = decoded.data;
  } else {
    throw new Error('Unsupported image format. Use JPEG or PNG');
  }
  const rgb = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < pixelsRGBA.length; i += 4, j += 3) {
    rgb[j] = pixelsRGBA[i] / 255;
    rgb[j + 1] = pixelsRGBA[i + 1] / 255;
    rgb[j + 2] = pixelsRGBA[i + 2] / 255;
  }
  const tensor = tf.tensor3d(rgb, [height, width, 3]);
  const resized = tf.image.resizeBilinear(tensor, [224, 224]);
  const batched = resized.expandDims(0);
  tensor.dispose();
  resized.dispose();
  return batched;
}

exports.upsertTextEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'text', text, metadata } = req.body;
    if (!sourceId || !text) {
      return res.status(400).json({ success: false, message: 'sourceId and text are required' });
    }

    const model = await use.load();
    const embeddingTensor = await model.embed([text]);
    const embeddingArray2D = await embeddingTensor.array();
    const vector = embeddingArray2D[0];
    embeddingTensor.dispose();

    const payload = { sourceId, sourceType, text, vector, metadata };
    const doc = await Embedding.findOneAndUpdate(
      { sourceId, sourceType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: { id: doc._id, dims: vector.length } });
  } catch (error) {
    next(error);
  }
};

exports.upsertImageEmbedding = async (req, res, next) => {
  try {
    const { sourceId, sourceType = 'image', metadata, filename } = req.body;
    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }
    if (!req.file && !req.body.imageBase64 && !req.body.imagePath) {
      return res.status(400).json({ success: false, message: 'Provide image via multipart file, imageBase64, or imagePath' });
    }

    let buffer;
    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.body.imageBase64) {
      const base64 = req.body.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      buffer = Buffer.from(base64, 'base64');
    } else if (req.body.imagePath) {
      const absolute = path.resolve(process.cwd(), req.body.imagePath);
      buffer = fs.readFileSync(absolute);
    }

    const input = await loadImageAsTensorFromBuffer(buffer);
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    const features = model.infer(input, { embedding: true });
    const vector = Array.from(await features.data());
    input.dispose();
    features.dispose();

    const text = filename || req.body.imagePath || 'uploaded-image';
    const payload = { sourceId, sourceType, text, vector, metadata };
    const doc = await Embedding.findOneAndUpdate(
      { sourceId, sourceType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: { id: doc._id, dims: vector.length } });
  } catch (error) {
    next(error);
  }
};

exports.getEmbeddingBySource = async (req, res, next) => {
  try {
    const { sourceType, sourceId } = req.params;
    const doc = await Embedding.findOne({ sourceType, sourceId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Embedding not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

exports.searchByCosineSimilarity = async (req, res, next) => {
  try {
    const { vector, topK = 5, sourceType } = req.body;
    if (!Array.isArray(vector) || vector.length === 0) {
      return res.status(400).json({ success: false, message: 'vector array is required' });
    }
    const filter = sourceType ? { sourceType } : {};
    const all = await Embedding.find(filter).lean();
    function cosineSim(a, b) {
      let dot = 0, na = 0, nb = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
      return dot / denom;
    }
    const scored = all.map(d => ({ doc: d, score: cosineSim(vector, d.vector) }));
    scored.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: scored.slice(0, Number(topK)) });
  } catch (error) {
    next(error);
  }
};


