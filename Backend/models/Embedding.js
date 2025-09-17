const mongoose = require('mongoose');

const EmbeddingSchema = new mongoose.Schema(
  {
    sourceId: { type: String, index: true, required: true },
    sourceType: { type: String, index: true, required: true },
    text: { type: String, required: true },
    vector: { type: [Number], index: false, required: true },
    metadata: { type: Object },
  },
  { timestamps: true }
);

EmbeddingSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model('Embedding', EmbeddingSchema);


