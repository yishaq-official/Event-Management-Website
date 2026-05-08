const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// @desc    Create booking with payment
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId, ticketType, quantity, attendees } = req.body;
    const userId = req.user._id;

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is approved
    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for booking'
      });
    }

    // Check if event has ended
    if (new Date(event.date.startDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book past events'
      });
    }

    // Find the ticket type
    const ticket = event.tickets.find(t => t.type === ticketType);
    if (!ticket) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket type'
      });
    }

    // Check availability
    if (ticket.available < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${ticket.available} tickets available`
      });
    }

    // Check if user has already booked this event
    const existingBooking = await Booking.findOne({
      user: userId,
      event: eventId,
      bookingStatus: { $in: ['confirmed', 'completed'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You have already booked this event'
      });
    }

    // Calculate total amount
    const totalAmount = ticket.price * quantity;

    // Create booking
    const booking = await Booking.create({
      user: userId,
      event: eventId,
      tickets: [{
        type: ticketType,
        name: ticket.name,
        price: ticket.price,
        quantity: quantity
      }],
      totalAmount,
      attendees: attendees || [],
      bookingStatus: 'pending'
    });

    // If free event, confirm immediately
    if (totalAmount === 0) {
      booking.bookingStatus = 'confirmed';
      booking.paymentStatus = 'completed';
      await booking.save();

      // Update ticket availability
      ticket.available -= quantity;
      await event.save();

      // Update event current attendees
      await Event.findByIdAndUpdate(eventId, {
        $inc: { currentAttendees: quantity }
      });

      return res.status(201).json({
        success: true,
        message: 'Booking confirmed successfully',
        booking
      });
    }

    // Create Stripe payment intent for paid events
    if (!stripe) {
      await Booking.findByIdAndDelete(booking._id);

      return res.status(503).json({
        success: false,
        message: 'Payment processing is not configured'
      });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          bookingId: booking._id.toString(),
          eventId: eventId.toString(),
          userId: userId.toString()
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Update booking with payment intent
      booking.stripePaymentIntentId = paymentIntent.id;
      await booking.save();

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking,
        clientSecret: paymentIntent.client_secret
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // Delete the booking if payment intent creation failed
      await Booking.findByIdAndDelete(booking._id);
      
      return res.status(500).json({
        success: false,
        message: 'Payment processing failed',
        error: stripeError.message
      });
    }
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating booking'
    });
  }
};

// @desc    Confirm payment and finalize booking
// @route   POST /api/bookings/:id/confirm-payment
// @access  Private
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    const bookingId = req.params.id;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId).populate('event');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this booking'
      });
    }

    if (booking.bookingStatus === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking already confirmed'
      });
    }

    // Retrieve payment intent from Stripe
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment processing is not configured'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    // Update booking status
    booking.bookingStatus = 'confirmed';
    booking.paymentStatus = 'completed';
    booking.confirmedAt = new Date();
    await booking.save();

    // Update ticket availability
    const ticket = booking.event.tickets.find(t => t.type === booking.tickets[0].type);
    if (ticket) {
      ticket.available -= booking.tickets[0].quantity;
      await booking.event.save();
    }

    // Update event current attendees
    await Event.findByIdAndUpdate(booking.event._id, {
      $inc: { currentAttendees: booking.tickets[0].quantity }
    });

    // Create payment record
    await Payment.create({
      booking: booking._id,
      user: userId,
      event: booking.event._id,
      amount: booking.totalAmount,
      currency: 'usd',
      status: 'completed',
      gateway: 'stripe',
      transactionId: paymentIntentId,
      paymentMethod: 'card',
      metadata: {
        paymentIntentId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and booking finalized',
      booking
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error confirming payment'
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    // Status filter
    if (req.query.status) {
      filter.bookingStatus = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate('event', 'title banner date startDate endDate location eventType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      bookings
    });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking or is the event organizer
    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      booking.event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching booking'
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const bookingId = req.params.id;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId).populate('event');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking belongs to user
    if (booking.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking already cancelled'
      });
    }

    if (booking.bookingStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed event booking'
      });
    }

    // Check refund policy
    const eventDate = new Date(booking.event.date.startDate);
    const now = new Date();
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundStatus = 'no-refund';

    if (hoursUntilEvent >= 24) {
      // Full refund if more than 24 hours before event
      refundAmount = booking.totalAmount;
      refundStatus = 'full-refund';
    } else if (hoursUntilEvent >= 2) {
      // 50% refund if 2-24 hours before event
      refundAmount = booking.totalAmount * 0.5;
      refundStatus = 'partial-refund';
    }

    // Process refund if applicable
    if (refundAmount > 0 && booking.stripePaymentIntentId && stripe) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            bookingId: bookingId,
            reason: reason || 'Customer requested cancellation'
          }
        });

        // Update payment record
        await Payment.create({
          booking: bookingId,
          user: userId,
          event: booking.event._id,
          amount: refundAmount,
          currency: 'usd',
          status: 'completed',
          gateway: 'stripe',
          transactionId: refund.id,
          paymentMethod: 'refund',
          metadata: {
            refundId: refund.id,
            originalPaymentIntentId: booking.stripePaymentIntentId
          }
        });
      } catch (stripeError) {
        console.error('Refund error:', stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status
    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = reason || 'User cancelled';
    booking.cancelledAt = new Date();
    booking.refundStatus = refundStatus;
    booking.refundAmount = refundAmount;
    await booking.save();

    // Update ticket availability
    const ticket = booking.event.tickets.find(t => t.type === booking.tickets[0].type);
    if (ticket) {
      ticket.available += booking.tickets[0].quantity;
      await booking.event.save();
    }

    // Update event current attendees
    await Event.findByIdAndUpdate(booking.event._id, {
      $inc: { currentAttendees: -booking.tickets[0].quantity }
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount,
      refundStatus
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling booking'
    });
  }
};

// @desc    Check-in attendee
// @route   POST /api/bookings/:id/check-in
// @access  Private (Organizer/Admin)
const checkInAttendee = async (req, res, next) => {
  try {
    const { attendeeId, qrCode } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId).populate('event');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is event organizer or admin
    if (
      booking.event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check in attendees'
      });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not confirmed'
      });
    }

    // Find attendee
    const attendee = booking.attendees.id(attendeeId);
    if (!attendee) {
      return res.status(404).json({
        success: false,
        message: 'Attendee not found'
      });
    }

    if (attendee.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'Attendee already checked in'
      });
    }

    // Check-in attendee
    attendee.checkedIn = true;
    attendee.checkedInAt = new Date();
    attendee.checkedInBy = req.user._id;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Attendee checked in successfully',
      attendee
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking in attendee'
    });
  }
};

// @desc    Get event bookings (Organizer/Admin)
// @route   GET /api/bookings/event/:eventId
// @access  Private (Organizer/Admin)
const getEventBookings = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user is event organizer or admin
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (
      event.organizer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view event bookings'
      });
    }

    const filter = { event: eventId };

    // Status filter
    if (req.query.status) {
      filter.bookingStatus = req.query.status;
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      bookings
    });
  } catch (error) {
    console.error('Get event bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching event bookings'
    });
  }
};

module.exports = {
  createBooking,
  confirmPayment,
  getMyBookings,
  getBooking,
  cancelBooking,
  checkInAttendee,
  getEventBookings
};
