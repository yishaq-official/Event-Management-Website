const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'booking-confirmed',
      'booking-cancelled',
      'event-reminder',
      'event-updated',
      'event-cancelled',
      'payment-received',
      'payment-failed',
      'review-approved',
      'review-response',
      'event-featured',
      'profile-updated',
      'security-alert',
      'system-update',
      'marketing',
      'custom'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    },
    paymentId: String,
    actionUrl: String,
    actionText: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  scheduledFor: Date,
  sentAt: Date,
  deliveredAt: Date,
  expiresAt: Date,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  metadata: {
    source: {
      type: String,
      enum: ['system', 'user', 'admin', 'api'],
      default: 'system'
    },
    campaign: String,
    category: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });

// Virtual for is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for is scheduled
notificationSchema.virtual('isScheduled').get(function() {
  if (!this.scheduledFor) return false;
  return new Date() < this.scheduledFor;
});

// Virtual for can retry
notificationSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

// Pre-save middleware to validate scheduling
notificationSchema.pre('save', function() {
  if (this.scheduledFor && this.scheduledFor <= new Date()) {
    this.scheduledFor = undefined;
  }
});

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(userId, limit = 10) {
  return this.find({
    recipient: userId,
    read: false,
    status: { $in: ['sent', 'delivered'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('sender', 'name profileImage');
};

// Static method to find by recipient
notificationSchema.statics.findByRecipient = function(userId, options = {}) {
  const query = { recipient: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.read !== undefined) {
    query.read = options.read;
  }
  
  return this.find(query)
    .populate('sender', 'name profileImage')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20);
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (this.read) return this;
  
  this.read = true;
  this.readAt = new Date();
  this.status = 'read';
  
  return this.save();
};

// Method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = function(notificationIds, userId) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId,
      read: false
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
        status: 'read'
      }
    }
  );
};

// Method to send notification
notificationSchema.methods.send = async function() {
  if (this.isScheduled) {
    return this;
  }
  
  this.status = 'sent';
  this.sentAt = new Date();
  
  // Here you would integrate with email service, push notification service, etc.
  // For now, we'll just mark as delivered for in-app notifications
  
  if (this.channels.inApp) {
    this.status = 'delivered';
    this.deliveredAt = new Date();
  }
  
  return this.save();
};

// Method to schedule notification
notificationSchema.methods.schedule = function(date) {
  if (date <= new Date()) {
    throw new Error('Scheduled date must be in the future');
  }
  
  this.scheduledFor = date;
  this.status = 'pending';
  
  return this.save();
};

// Static method to create booking notification
notificationSchema.statics.createBookingNotification = function(userId, bookingId, type = 'booking-confirmed') {
  return this.create({
    recipient: userId,
    type,
    title: type === 'booking-confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
    message: type === 'booking-confirmed' 
      ? 'Your booking has been confirmed successfully.'
      : 'Your booking has been cancelled.',
    data: { bookingId },
    channels: { inApp: true, email: true },
    priority: 'high'
  });
};

// Static method to create event reminder
notificationSchema.statics.createEventReminder = function(userId, eventId, hoursBefore = 24) {
  const scheduledFor = new Date();
  scheduledFor.setHours(scheduledFor.getHours() - hoursBefore);
  
  return this.create({
    recipient: userId,
    type: 'event-reminder',
    title: 'Event Reminder',
    message: `Your event is starting in ${hoursBefore} hours.`,
    data: { eventId },
    channels: { inApp: true, email: true, push: true },
    priority: 'high',
    scheduledFor
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
