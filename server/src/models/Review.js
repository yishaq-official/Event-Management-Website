const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters long'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return v.length <= 5; // Maximum 5 images
      },
      message: 'Cannot upload more than 5 images'
    }
  }],
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'pending'
  },
  moderation: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    flagged: {
      type: Boolean,
      default: false
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: Date,
    flagReason: String
  },
  organizerResponse: {
    response: {
      type: String,
      maxlength: [500, 'Response cannot exceed 500 characters']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  verified: {
    type: Boolean,
    default: false
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  categories: [{
    type: String,
    enum: [
      'organization', 'content', 'venue', 'speakers', 'networking',
      'value-for-money', 'atmosphere', 'logistics', 'food', 'other'
    ]
  }],
  recommendations: {
    wouldRecommend: {
      type: Boolean,
      required: true
    },
    wouldAttendAgain: {
      type: Boolean,
      required: true
    }
  },
  aspects: {
    contentQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    speakerQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    venueQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    organization: {
      type: Number,
      min: 1,
      max: 5
    },
    valueForMoney: {
      type: Number,
      min: 1,
      max: 5
    },
    networking: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: {
      type: String,
      enum: ['web', 'mobile', 'api']
    },
    location: {
      country: String,
      city: String
    }
  },
  editHistory: [{
    editedAt: Date,
    changes: String,
    previousContent: mongoose.Schema.Types.Mixed
  }],
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'fake', 'offensive', 'other'],
      required: true
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    action: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
reviewSchema.index({ user: 1 });
reviewSchema.index({ event: 1 });
reviewSchema.index({ booking: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ 'moderation.flagged': 1 });

// Compound index to prevent duplicate reviews
reviewSchema.index({ user: 1, event: 1 }, { unique: true });

// Virtual for display name
reviewSchema.virtual('displayName').get(function() {
  if (this.anonymous) {
    return 'Anonymous User';
  }
  return this.user ? this.user.name : 'Unknown User';
});

// Virtual for is editable
reviewSchema.virtual('isEditable').get(function() {
  const now = new Date();
  const createdAt = new Date(this.createdAt);
  const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
  
  return daysSinceCreation <= 30 && this.status === 'approved';
});

// Virtual for helpful count
reviewSchema.virtual('helpfulCount').get(function() {
  return this.helpful.count;
});

// Virtual for average aspect rating
reviewSchema.virtual('averageAspectRating').get(function() {
  const aspects = Object.values(this.aspects).filter(rating => rating != null);
  if (aspects.length === 0) return null;
  
  const sum = aspects.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / aspects.length) * 10) / 10;
});

// Pre-save middleware to validate booking
reviewSchema.pre('save', async function() {
  if (this.isNew) {
    // Check if user actually attended the event
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.booking);
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.user.toString() !== this.user.toString()) {
      throw new Error('Booking does not belong to this user');
    }
    
    if (booking.event.toString() !== this.event.toString()) {
      throw new Error('Booking does not belong to this event');
    }
    
    if (booking.bookingStatus !== 'completed') {
      throw new Error('Can only review completed events');
    }
    
    // Check if event has ended
    const Event = mongoose.model('Event');
    const event = await Event.findById(this.event);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    const now = new Date();
    const eventEnd = new Date(event.date.endDate);
    
    if (now < eventEnd) {
      throw new Error('Can only review events that have ended');
    }
    
    this.verified = true;
  }
});

// Pre-save middleware to update helpful count
reviewSchema.pre('save', function() {
  if (this.isModified('helpful.users')) {
    this.helpful.count = this.helpful.users.length;
  }
});

// Static method to find approved reviews
reviewSchema.statics.findApproved = function(filter = {}) {
  return this.find({ ...filter, status: 'approved' })
    .populate('user', 'name profileImage')
    .populate('event', 'title')
    .sort({ createdAt: -1 });
};

// Static method to find reviews by event
reviewSchema.statics.findByEvent = function(eventId, options = {}) {
  const query = { event: eventId };
  
  if (options.status) {
    query.status = options.status;
  } else {
    query.status = 'approved'; // Default to approved reviews
  }
  
  if (options.rating) {
    query.rating = options.rating;
  }
  
  return this.find(query)
    .populate('user', 'name profileImage')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 10);
};

// Static method to find reviews by user
reviewSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('event', 'title banner date')
    .sort(options.sort || { createdAt: -1 });
};

// Method to mark as helpful
reviewSchema.methods.markHelpful = function(userId) {
  if (this.helpful.users.includes(userId)) {
    // Remove helpful if already marked
    this.helpful.users = this.helpful.users.filter(id => id.toString() !== userId.toString());
  } else {
    // Add helpful
    this.helpful.users.push(userId);
  }
  
  return this.save();
};

// Method to add organizer response
reviewSchema.methods.addOrganizerResponse = function(response, respondedBy) {
  this.organizerResponse = {
    response,
    respondedAt: new Date(),
    respondedBy
  };
  
  return this.save();
};

// Method to edit review
reviewSchema.methods.editReview = function(updates, userId) {
  if (!this.isEditable) {
    throw new Error('Review is no longer editable');
  }
  
  // Store edit history
  this.editHistory.push({
    editedAt: new Date(),
    changes: 'Review updated',
    previousContent: {
      rating: this.rating,
      title: this.title,
      comment: this.comment
    }
  });
  
  // Apply updates
  Object.assign(this, updates);
  
  return this.save();
};

// Method to report review
reviewSchema.methods.report = function(reason, description, reportedBy) {
  this.reports.push({
    reportedBy,
    reason,
    description,
    reportedAt: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
