const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'EUR', 'GBP', 'ETB', 'CAD', 'AUD'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially-refunded'],
    default: 'pending'
  },
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'chapa', 'telebirr', 'bank-transfer', 'cash'],
    required: [true, 'Payment gateway is required']
  },
  gatewayTransactionId: {
    type: String,
    required: [true, 'Gateway transaction ID is required'],
    unique: true,
    sparse: true
  },
  gatewayPaymentIntentId: String,
  gatewayResponse: {
    raw: mongoose.Schema.Types.Mixed,
    status: String,
    message: String,
    code: String,
    fees: {
      processing: Number,
      gateway: Number,
      platform: Number
    }
  },
  method: {
    type: String,
    enum: ['card', 'bank-account', 'mobile-money', 'paypal', 'crypto', 'cash'],
    required: function() {
      return this.gateway !== 'cash';
    }
  },
  cardDetails: {
    last4: String,
    brand: String,
    expMonth: Number,
    expYear: Number,
    fingerprint: String,
    country: String
  },
  bankDetails: {
    bankName: String,
    accountLast4: String,
    routingNumber: String,
    swiftCode: String
  },
  mobileMoneyDetails: {
    provider: String,
    phoneNumber: String,
    reference: String
  },
  refunds: [{
    amount: {
      type: Number,
      required: true,
      min: [0, 'Refund amount cannot be negative']
    },
    reason: {
      type: String,
      required: true,
      maxlength: [500, 'Refund reason cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    gatewayRefundId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  fees: {
    processing: {
      type: Number,
      default: 0
    },
    gateway: {
      type: Number,
      default: 0
    },
    platform: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  netAmount: {
    type: Number,
    required: true
  },
  billingAddress: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  shippingAddress: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    },
    sessionId: String,
    deviceFingerprint: String,
    riskScore: Number,
    fraudCheck: {
      status: {
        type: String,
        enum: ['pending', 'passed', 'failed', 'review'],
        default: 'pending'
      },
      score: Number,
      reasons: [String],
      checkedAt: Date
    }
  },
  timeline: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially-refunded'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    gatewayTransactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    notes: String,
    source: {
      type: String,
      enum: ['system', 'user', 'admin', 'gateway'],
      default: 'system'
    }
  }],
  retries: {
    count: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    nextRetryAt: Date,
    lastRetryAt: Date
  },
  webhooks: [{
    eventType: String,
    gateway: String,
    receivedAt: Date,
    processedAt: Date,
    data: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    },
    error: String
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    maxlength: [2000, 'Internal notes cannot exceed 2000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
paymentSchema.index({ user: 1 });
paymentSchema.index({ event: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gateway: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for total refunded amount
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds.reduce((total, refund) => {
    if (refund.status === 'completed') {
      return total + refund.amount;
    }
    return total;
  }, 0);
});

// Virtual for remaining amount
paymentSchema.virtual('remainingAmount').get(function() {
  return this.amount - this.totalRefunded;
});

// Virtual for is fully refunded
paymentSchema.virtual('isFullyRefunded').get(function() {
  return this.totalRefunded >= this.amount;
});

// Virtual for can be refunded
paymentSchema.virtual('canBeRefunded').get(function() {
  return this.status === 'completed' && !this.isFullyRefunded;
});

// Virtual for is successful
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed';
});

// Pre-save middleware to calculate net amount and fees
paymentSchema.pre('save', function() {
  if (this.isNew || this.isModified('fees')) {
    this.fees.total = this.fees.processing + this.fees.gateway + this.fees.platform;
    this.netAmount = this.amount - this.fees.total;
  }
});

// Pre-save middleware to add timeline entry
paymentSchema.pre('save', function() {
  if (this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      gatewayTransactionId: this.gatewayTransactionId
    });
  } else if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      gatewayTransactionId: this.gatewayTransactionId,
      notes: `Status changed to ${this.status}`
    });
  }
});

// Static method to find by user
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.gateway) {
    query.gateway = options.gateway;
  }
  
  return this.find(query)
    .populate('booking', 'totalAmount bookingStatus')
    .populate('event', 'title date')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to find by event
paymentSchema.statics.findByEvent = function(eventId, options = {}) {
  const query = { event: eventId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('user', 'name email')
    .populate('booking', 'totalAmount bookingStatus')
    .sort(options.sort || { createdAt: -1 });
};

// Method to process refund
paymentSchema.methods.processRefund = function(amount, reason, processedBy) {
  if (!this.canBeRefunded) {
    throw new Error('Payment cannot be refunded');
  }
  
  if (amount > this.remainingAmount) {
    throw new Error('Refund amount cannot exceed remaining amount');
  }
  
  const refund = {
    amount,
    reason,
    status: 'pending',
    processedBy,
    createdAt: new Date()
  };
  
  this.refunds.push(refund);
  
  // Update payment status if fully refunded
  if (this.totalRefunded + amount >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially-refunded';
  }
  
  return this.save();
};

// Method to add timeline entry
paymentSchema.methods.addTimelineEntry = function(status, notes, source = 'system') {
  this.timeline.push({
    status,
    timestamp: new Date(),
    notes,
    source
  });
  
  return this.save();
};

// Method to retry payment
paymentSchema.methods.retry = function() {
  if (this.retries.count >= this.retries.maxRetries) {
    throw new Error('Maximum retry attempts exceeded');
  }
  
  this.retries.count += 1;
  this.retries.lastRetryAt = new Date();
  
  // Calculate next retry time (exponential backoff)
  const delayMinutes = Math.pow(2, this.retries.count) * 5; // 5, 10, 20 minutes
  this.retries.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  
  this.status = 'pending';
  
  return this.save();
};

// Method to process webhook
paymentSchema.methods.processWebhook = function(eventType, data, gateway) {
  this.webhooks.push({
    eventType,
    gateway,
    receivedAt: new Date(),
    data,
    status: 'pending'
  });
  
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
