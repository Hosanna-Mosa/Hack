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
    const { sourceId, sourceType = 'image', metadata, filename, verbose } = req.body;
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

    const base = { id: doc._id, dims: vector.length };
    if (String(verbose) === 'true') {
      base.vector = vector;
      base.metadata = metadata;
      base.sourceId = sourceId;
      base.sourceType = sourceType;
    }
    res.status(201).json({ success: true, data: base });
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


// Compare an input image against stored image embeddings and report best match
// Accepts: multipart file field 'image' or JSON { imageBase64 | imagePath }
// Optional: threshold (default 0.85) and sourceType filter
exports.compareImage = async (req, res, next) => {
  try {
    const { threshold = 0.85, sourceType, verbose, perDim } = req.body;
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
    const queryVector = Array.from(await features.data());
    input.dispose();
    features.dispose();

    const filter = sourceType ? { sourceType } : {};
    const all = await Embedding.find(filter).lean();

    function cosineSimWithDetails(a, b, collectPerDim) {
      let dot = 0, na = 0, nb = 0;
      const len = Math.min(a.length, b.length);
      const per = collectPerDim ? [] : null;
      for (let i = 0; i < len; i++) {
        const ai = a[i];
        const bi = b[i];
        const prod = ai * bi;
        dot += prod;
        na += ai * ai;
        nb += bi * bi;
        if (per) per.push({ i, a: ai, b: bi, prod });
      }
      const normA = Math.sqrt(na);
      const normB = Math.sqrt(nb);
      const denom = normA * normB || 1;
      const score = dot / denom;
      return { score, dot, normA, normB, denom, len, perDim: per };
    }

    const scored = all.map(d => {
      const details = cosineSimWithDetails(queryVector, d.vector, String(perDim) === 'true');
      return { doc: d, score: details.score, details };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0] || null;
    const matched = Boolean(best && best.score >= Number(threshold));

    const response = { matched, threshold: Number(threshold) };
    if (best) response.bestMatch = best;
    if (String(verbose) === 'true') {
      response.queryVector = queryVector;
      response.candidates = scored;
    }
    return res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

// Compare two stored embeddings by sourceId values
// Body: { sourceIdA: string, sourceIdB: string, threshold?: number, sourceType?: string }
exports.compareStored = async (req, res, next) => {
  try {
    const { sourceIdA, sourceIdB, threshold = 0.9, sourceType = 'image', verbose, perDim } = req.body;
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
    function cosineSimilarityWithDetails(x, y, collectPerDim) {
      let dot = 0, nx = 0, ny = 0;
      const len = Math.min(x.length, y.length);
      const per = collectPerDim ? [] : null;
      for (let i = 0; i < len; i++) {
        const xi = x[i];
        const yi = y[i];
        const prod = xi * yi;
        dot += prod;
        nx += xi * xi;
        ny += yi * yi;
        if (per) per.push({ i, a: xi, b: yi, prod });
      }
      const normA = Math.sqrt(nx);
      const normB = Math.sqrt(ny);
      const denom = normA * normB || 1;
      const score = dot / denom;
      return { score, dot, normA, normB, denom, len, perDim: per };
    }
    const details = cosineSimilarityWithDetails(a.vector, b.vector, String(perDim) === 'true');
    const score = details.score;
    // Also report normalized L2 distance derived from cosine for transparency
    const normDistance = Math.sqrt(Math.max(0, 2 * (1 - score)));
    const t = Number(threshold);
    const matched = score >= t;
    const payload = { matched, cosine: score, normDistance, threshold: t, a: { id: a._id, sourceId: a.sourceId }, b: { id: b._id, sourceId: b.sourceId } };
    if (String(verbose) === 'true') {
      payload.details = details;
      payload.a.vector = a.vector;
      payload.b.vector = b.vector;
    }
    return res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};


