const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  type: {
    type: String,
    enum: ['attendance_alert', 'general', 'emergency', 'reminder', 'announcement'],
    required: [true, 'Notification type is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['sent', 'pending', 'failed', 'delivered', 'read'],
    default: 'pending'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['AttendanceRecord', 'Student', 'Class', 'School']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  channels: [{
    type: String,
    enum: ['email', 'sms', 'push', 'in_app']
  }],
  transmittedAt: Date,
  readAt: Date,
  metadata: {
    subject: String,
    templateId: String,
    variables: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, status: 1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.virtual('recipient', {
  ref: 'User',
  localField: 'recipientId',
  foreignField: '_id',
  justOne: true
});

notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
