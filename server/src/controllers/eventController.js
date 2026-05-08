const Event = require('../models/Event');
const { validationResult } = require('express-validator');

// @desc    Get all events (public)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { status: 'approved' };
    
    // Search
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Event type filter
    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }

    // Price filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter['tickets.price'] = {};
      if (req.query.minPrice) {
        filter['tickets.price'].$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter['tickets.price'].$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Date filter
    if (req.query.startDate || req.query.endDate) {
      filter['date.startDate'] = {};
      if (req.query.startDate) {
        filter['date.startDate'].$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter['date.startDate'].$lte = new Date(req.query.endDate);
      }
    }

    // Location filter (nearby events)
    if (req.query.lat && req.query.lng && req.query.radius) {
      filter['location'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat)]
          },
          $maxDistance: parseInt(req.query.radius) * 1000 // Convert km to meters
        }
      };
    }

    // Build sort
    let sort = {};
    switch (req.query.sort) {
      case 'date-asc':
        sort['date.startDate'] = 1;
        break;
      case 'date-desc':
        sort['date.startDate'] = -1;
        break;
      case 'price-asc':
        sort['tickets.price'] = 1;
        break;
      case 'price-desc':
        sort['tickets.price'] = -1;
        break;
      case 'popularity':
        sort['analytics.views'] = -1;
        break;
      case 'rating':
        sort['averageRating'] = -1;
        break;
      default:
        sort['date.startDate'] = 1;
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name profileImage')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching events'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name profileImage bio')
      .populate('averageRating')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Only show approved events to public
    if (event.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    await Event.findByIdAndUpdate(req.params.id, {
      $inc: { 'analytics.views': 1 }
    });

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching event'
    });
  }
};

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
const getFeaturedEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const events = await Event.findFeatured(limit);

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching featured events'
    });
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
const getUpcomingEvents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const events = await Event.findUpcoming(limit);

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching upcoming events'
    });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private (Organizer/Admin)
const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Set organizer to current user
    req.body.organizer = req.user._id;

    // Set initial status based on user role
    req.body.status = req.user.role === 'admin' ? 'approved' : 'pending';

    const event = await Event.create(req.body);

    // Populate organizer info for response
    await event.populate('organizer', 'name profileImage');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating event'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Event Owner/Admin)
const updateEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Don't allow status changes through this endpoint (use dedicated approval endpoint)
    delete req.body.status;
    delete req.body.approvalStatus;

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('organizer', 'name profileImage');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating event'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Event Owner/Admin)
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Check if event has bookings
    const Booking = require('../models/Booking');
    const bookingCount = await Booking.countDocuments({ 
      event: req.params.id, 
      bookingStatus: { $in: ['confirmed', 'completed'] }
    });

    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete event with existing bookings. Cancel the event instead.'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting event'
    });
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/my-events
// @access  Private (Organizer)
const getMyEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { organizer: req.user._id };

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      events
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your events'
    });
  }
};

// @desc    Update event status (Admin only)
// @route   PUT /api/events/:id/status
// @access  Private (Admin)
const updateEventStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = status;
    event.approvalStatus = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      rejectionReason: status === 'rejected' ? rejectionReason : undefined
    };

    await event.save();

    await event.populate('organizer', 'name email');

    res.status(200).json({
      success: true,
      message: `Event ${status} successfully`,
      event
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating event status'
    });
  }
};

// @desc    Get event analytics (Organizer only)
// @route   GET /api/events/:id/analytics
// @access  Private (Event Owner/Admin)
const getEventAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this event analytics'
      });
    }

    const Booking = require('../models/Booking');
    const Review = require('../models/Review');

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: '$bookingStatus',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get review statistics
    const reviewStats = await Review.aggregate([
      { $match: { event: event._id, status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Get daily booking trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrends = await Booking.aggregate([
      {
        $match: {
          event: event._id,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const analytics = {
      views: event.analytics.views,
      shares: event.analytics.shares,
      clicks: event.analytics.clicks,
      bookingStats,
      reviewStats: reviewStats[0] || { averageRating: 0, totalReviews: 0 },
      dailyTrends,
      capacity: {
        total: event.capacity,
        current: event.currentAttendees,
        available: event.capacity - event.currentAttendees
      }
    };

    res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching event analytics'
    });
  }
};

module.exports = {
  getEvents,
  getEvent,
  getFeaturedEvents,
  getUpcomingEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  updateEventStatus,
  getEventAnalytics
};
