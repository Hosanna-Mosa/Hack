const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true
  },
  dataType: {
    type: String,
    enum: ['attendance', 'student', 'class', 'user', 'notification'],
    required: [true, 'Data type is required']
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Payload is required']
  },
  status: {
    type: String,
    enum: ['pending', 'synced', 'failed', 'processing'],
    default: 'pending'
  },
  retried: {
    type: Number,
    default: 0,
    max: 5
  },
  error: {
    message: String,
    code: String,
    stack: String
  },
  syncedAt: Date,
  metadata: {
    deviceInfo: {
      model: String,
      os: String,
      version: String,
      appVersion: String
    },
    networkInfo: {
      type: String,
      strength: Number
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  }
}, {
  timestamps: true
});

syncQueueSchema.index({ deviceId: 1, status: 1 });
syncQueueSchema.index({ dataType: 1, status: 1 });
syncQueueSchema.index({ createdAt: 1 });
syncQueueSchema.index({ status: 1, retried: 1 });

module.exports = mongoose.model('SyncQueue', syncQueueSchema);
