require('dotenv').config();
const path = require('path');
const fs = require('fs');
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
const connectDB = require('../config/database');
const Embedding = require('../models/Embedding');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const key = part.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function loadImageAsTensor(imagePath) {
  const absolute = path.resolve(process.cwd(), imagePath);
  const buffer = fs.readFileSync(absolute);
  const lower = absolute.toLowerCase();
  let width, height, pixelsRGBA;
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    width = decoded.width;
    height = decoded.height;
    pixelsRGBA = decoded.data; // RGBA
  } else if (lower.endsWith('.png')) {
    const decoded = PNG.sync.read(buffer);
    width = decoded.width;
    height = decoded.height;
    pixelsRGBA = decoded.data; // RGBA
  } else {
    throw new Error('Unsupported image format. Use .jpg/.jpeg or .png');
  }
  // Convert RGBA -> RGB float32 [0,1]
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

async function main() {
  const args = parseArgs(process.argv);
  const file = args.file || args.image || args.path;
  if (!file) {
    throw new Error('Provide --file path/to/image');
  }
  const sourceId = args.sourceId || path.basename(file);
  const sourceType = args.sourceType || 'image';
  const metadata = args.metadata ? JSON.parse(args.metadata) : undefined;

  await connectDB();

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

  const payload = {
    sourceId,
    sourceType,
    text: file,
    vector,
    metadata,
  };

  console.log('Upserting embedding document...');
  await Embedding.findOneAndUpdate(
    { sourceId, sourceType },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Saved image embedding:', { sourceId, dims: vector.length });
  process.exit(0);
}

main().catch((err) => {
  console.error('Image embedding job failed:', err);
  process.exit(1);
});


