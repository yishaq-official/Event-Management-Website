const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['tech', 'music', 'business', 'sports', 'education', 'gaming', 'art', 'food', 'health', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: function() {
        return this.eventType === 'offline';
      }
    },
    venue: {
      type: String,
      required: function() {
        return this.eventType === 'offline';
      },
      trim: true
    },
    address: {
      street: String,
      city: {
        type: String,
        required: function() {
          return this.eventType === 'offline';
        }
      },
      state: String,
      country: {
        type: String,
        required: true
      },
      zipCode: String
    }
  },
  eventType: {
    type: String,
    enum: ['online', 'offline', 'hybrid'],
    default: 'offline'
  },
  onlineEventDetails: {
    platform: String,
    meetingUrl: String,
    meetingId: String,
    password: String
  },
  date: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function(value) {
          return value > this.date.startDate;
        },
        message: 'End date must be after start date'
      }
    }
  },
  time: {
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    }
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  tickets: [{
    type: {
      type: String,
      enum: ['free', 'standard', 'vip', 'early-bird'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
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
    available: {
      type: Number,
      required: true,
      min: [0, 'Available tickets cannot be negative']
    },
    description: {
      type: String,
      maxlength: [500, 'Ticket description cannot exceed 500 characters']
    },
    benefits: [String],
    saleStartDate: Date,
    saleEndDate: Date
  }],
  banner: {
    type: String,
    required: [true, 'Event banner is required']
  },
  images: [String],
  tags: [String],
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'draft'
  },
  approvalStatus: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String
  },
  capacity: {
    type: Number,
    required: [true, 'Event capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  currentAttendees: {
    type: Number,
    default: 0,
    min: [0, 'Current attendees cannot be negative']
  },
  ageRestriction: {
    min: Number,
    max: Number
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all-levels']
  },
  language: {
    type: String,
    default: 'en'
  },
  refundPolicy: {
    type: String,
    enum: ['no-refund', 'partial-refund', 'full-refund', 'custom'],
    default: 'no-refund'
  },
  refundDeadline: {
    type: Number, // Hours before event
    default: 24
  },
  customRefundPolicy: String,
  requirements: [String],
  whatToBring: [String],
  agenda: [{
    time: String,
    title: String,
    description: String,
    speaker: String
  }],
  speakers: [{
    name: {
      type: String,
      required: true
    },
    bio: String,
    photo: String,
    company: String,
    role: String
  }],
  sponsors: [{
    name: String,
    logo: String,
    website: String,
    tier: {
      type: String,
      enum: ['platinum', 'gold', 'silver', 'bronze']
    }
  }],
  socialLinks: {
    website: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  contact: {
    email: String,
    phone: String,
    website: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ category: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ 'date.startDate': 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ featured: 1 });
eventSchema.index({ location: '2dsphere' });

// Virtual for average rating
eventSchema.virtual('averageRating', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'event',
  match: { status: 'approved' }
});

// Virtual for total reviews
eventSchema.virtual('totalReviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'event',
  count: true
});

// Virtual for bookings
eventSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'event'
});

// Virtual for available tickets
eventSchema.virtual('totalAvailableTickets').get(function() {
  return this.tickets.reduce((total, ticket) => total + ticket.available, 0);
});

// Virtual for is sold out
eventSchema.virtual('isSoldOut').get(function() {
  return this.totalAvailableTickets === 0;
});

// Virtual for is upcoming
eventSchema.virtual('isUpcoming').get(function() {
  return new Date(this.date.startDate) > new Date();
});

// Virtual for is past
eventSchema.virtual('isPast').get(function() {
  return new Date(this.date.endDate) < new Date();
});

// Pre-save middleware to update current attendees
eventSchema.pre('save', function() {
  if (this.isModified('bookings')) {
    // This would be updated when bookings are created/cancelled
    // For now, we'll handle this in the booking controller
  }
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    'date.startDate': { $gte: new Date() },
    status: 'approved'
  })
  .sort({ 'date.startDate': 1 })
  .limit(limit)
  .populate('organizer', 'name email profileImage');
};

// Static method to find featured events
eventSchema.statics.findFeatured = function(limit = 6) {
  return this.find({
    featured: true,
    status: 'approved',
    'date.startDate': { $gte: new Date() }
  })
  .sort({ 'analytics.views': -1 })
  .limit(limit)
  .populate('organizer', 'name email profileImage');
};

// Method to check if user can book
eventSchema.methods.canBook = function(ticketType, quantity = 1) {
  const ticket = this.tickets.find(t => t.type === ticketType);
  if (!ticket) return false;
  if (ticket.available < quantity) return false;
  if (this.currentAttendees + quantity > this.capacity) return false;
  return true;
};

// Method to update ticket availability
eventSchema.methods.updateTicketAvailability = function(ticketType, quantity, action = 'decrease') {
  const ticket = this.tickets.find(t => t.type === ticketType);
  if (!ticket) return false;
  
  if (action === 'decrease') {
    ticket.available -= quantity;
    this.currentAttendees += quantity;
  } else {
    ticket.available += quantity;
    this.currentAttendees -= quantity;
  }
  
  return this.save();
};

module.exports = mongoose.model('Event', eventSchema);
