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
const use = require('@tensorflow-models/universal-sentence-encoder');
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

async function readInputText(args) {
  if (args.text) return args.text;
  if (args.file) {
    const filePath = path.resolve(process.cwd(), args.file);
    return fs.readFileSync(filePath, 'utf8');
  }
  throw new Error('Provide --text "your text" or --file path/to/file.txt');
}

async function main() {
  const args = parseArgs(process.argv);

  const sourceId = args.sourceId || args.id || 'default';
  const sourceType = args.sourceType || args.type || 'generic';
  const metadata = args.metadata ? JSON.parse(args.metadata) : undefined;

  if (!sourceId || !sourceType) {
    throw new Error('Missing required --sourceId and --sourceType');
  }

  await connectDB();

  const text = await readInputText(args);

  console.log('Loading embedding model...');
  const model = await use.load();
  console.log('Generating embedding...');
  const embeddingTensor = await model.embed([text]);
  const embeddingArray2D = await embeddingTensor.array();
  const vector = embeddingArray2D[0];
  embeddingTensor.dispose();

  const payload = {
    sourceId,
    sourceType,
    text,
    vector,
    metadata,
  };

  console.log('Upserting embedding document...');
  await Embedding.findOneAndUpdate(
    { sourceId, sourceType },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Saved embedding:', { sourceId, sourceType, dims: vector.length });
  process.exit(0);
}

main().catch((err) => {
  console.error('Embedding job failed:', err);
  process.exit(1);
});


