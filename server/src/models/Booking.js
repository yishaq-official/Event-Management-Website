const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  tickets: [{
    type: {
      type: String,
      enum: ['free', 'standard', 'vip', 'early-bird'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'ETB', 'CAD', 'AUD']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially-refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'chapa', 'telebirr', 'bank-transfer', 'cash'],
    required: function() {
      return this.totalAmount > 0;
    }
  },
  paymentDetails: {
    transactionId: String,
    paymentIntentId: String,
    gateway: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
    refundId: String
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed'
  },
  attendees: [{
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    ticketType: {
      type: String,
      required: true
    },
    qrCode: {
      type: String,
      required: true
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  discount: {
    code: String,
    amount: Number,
    percentage: Number,
    type: {
      type: String,
      enum: ['fixed', 'percentage']
    }
  },
  tax: {
    amount: Number,
    percentage: Number,
    name: String
  },
  fees: {
    serviceFee: Number,
    processingFee: Number,
    platformFee: Number
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  specialRequests: {
    type: String,
    maxlength: [1000, 'Special requests cannot exceed 1000 characters']
  },
  communication: {
    confirmationEmailSent: {
      type: Boolean,
      default: false
    },
    reminderEmailSent: {
      type: Boolean,
      default: false
    },
    followUpEmailSent: {
      type: Boolean,
      default: false
    },
    lastEmailSent: Date
  },
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    refundProcessed: {
      type: Boolean,
      default: false
    }
  },
  checkInStatus: {
    totalCheckedIn: {
      type: Number,
      default: 0
    },
    checkInTime: [Date],
    checkInNotes: String
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  tags: [String],
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'admin'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
bookingSchema.index({ user: 1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ 'date.startDate': 1 });
bookingSchema.index({ createdAt: 1 });
bookingSchema.index({ 'attendees.qrCode': 1 });

// Virtual for total quantity
bookingSchema.virtual('totalQuantity').get(function() {
  return this.tickets.reduce((total, ticket) => total + ticket.quantity, 0);
});

// Virtual for is paid
bookingSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'completed';
});

// Virtual for is refundable
bookingSchema.virtual('isRefundable').get(function() {
  if (this.bookingStatus !== 'confirmed') return false;
  if (this.paymentStatus !== 'completed') return false;
  
  const event = this.event;
  const now = new Date();
  const eventStart = new Date(event.date.startDate);
  const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);
  
  return hoursUntilEvent >= (event.refundDeadline || 24);
});

// Virtual for can check in
bookingSchema.virtual('canCheckIn').get(function() {
  if (this.bookingStatus !== 'confirmed') return false;
  if (this.paymentStatus !== 'completed') return false;
  
  const now = new Date();
  const eventStart = new Date(this.event.date.startDate);
  const eventEnd = new Date(this.event.date.endDate);
  
  return now >= eventStart && now <= eventEnd;
});

// Pre-save middleware to generate QR codes for attendees
bookingSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('attendees')) {
    const QRCode = require('qrcode');
    
    for (let attendee of this.attendees) {
      if (!attendee.qrCode) {
        const qrData = {
          bookingId: this._id,
          eventId: this.event,
          attendeeEmail: attendee.email,
          ticketType: attendee.ticketType
        };
        
        attendee.qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      }
    }
  }
  next();
});

// Pre-save middleware to calculate totals
bookingSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('tickets') || this.isModified('discount') || this.isModified('tax') || this.isModified('fees')) {
    // Calculate ticket subtotal
    let subtotal = 0;
    for (let ticket of this.tickets) {
      ticket.subtotal = ticket.price * ticket.quantity;
      subtotal += ticket.subtotal;
    }
    
    // Apply discount
    let totalAfterDiscount = subtotal;
    if (this.discount) {
      if (this.discount.type === 'fixed') {
        totalAfterDiscount = Math.max(0, subtotal - this.discount.amount);
      } else {
        totalAfterDiscount = subtotal * (1 - this.discount.percentage / 100);
      }
    }
    
    // Add tax and fees
    let total = totalAfterDiscount;
    if (this.tax && this.tax.amount) {
      total += this.tax.amount;
    }
    if (this.fees) {
      total += (this.fees.serviceFee || 0) + (this.fees.processingFee || 0) + (this.fees.platformFee || 0);
    }
    
    this.totalAmount = Math.round(total * 100) / 100; // Round to 2 decimal places
  }
  next();
});

// Static method to find user bookings
bookingSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.bookingStatus = options.status;
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  return this.find(query)
    .populate('event', 'title date location banner')
    .populate('user', 'name email')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to find event bookings
bookingSchema.statics.findByEvent = function(eventId, options = {}) {
  const query = { event: eventId };
  
  if (options.status) {
    query.bookingStatus = options.status;
  }
  
  if (options.paymentStatus) {
    query.paymentStatus = options.paymentStatus;
  }
  
  return this.find(query)
    .populate('user', 'name email profileImage')
    .sort(options.sort || { createdAt: -1 });
};

// Method to check in attendee
bookingSchema.methods.checkInAttendee = function(attendeeEmail, checkedInBy) {
  const attendee = this.attendees.find(a => a.email === attendeeEmail);
  if (!attendee) {
    throw new Error('Attendee not found');
  }
  
  if (attendee.checkedIn) {
    throw new Error('Attendee already checked in');
  }
  
  attendee.checkedIn = true;
  attendee.checkedInAt = new Date();
  attendee.checkedInBy = checkedInBy;
  
  this.checkInStatus.totalCheckedIn += 1;
  this.checkInStatus.checkInTime.push(new Date());
  
  return this.save();
};

// Method to cancel booking
bookingSchema.methods.cancel = function(reason, cancelledBy) {
  if (this.bookingStatus === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }
  
  if (this.bookingStatus === 'completed') {
    throw new Error('Cannot cancel completed booking');
  }
  
  this.bookingStatus = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date()
  };
  
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
