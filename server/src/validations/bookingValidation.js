const { body } = require('express-validator');

// Create booking validation
const createBookingValidation = [
  body('eventId')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  body('ticketType')
    .isIn(['free', 'standard', 'vip', 'early-bird'])
    .withMessage('Invalid ticket type'),
  
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  
  body('attendees')
    .isArray()
    .withMessage('Attendees must be an array')
    .optional(),
  
  body('attendees.*.name')
    .trim()
    .notEmpty()
    .withMessage('Attendee name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Attendee name must be between 2 and 50 characters'),
  
  body('attendees.*.email')
    .isEmail()
    .withMessage('Attendee email must be valid')
    .normalizeEmail(),
  
  body('attendees.*.phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Attendee phone number must be valid'),
  
  body('attendees.*.company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('attendees.*.jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title cannot exceed 100 characters'),
  
  body('attendees.*.dietaryRestrictions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Dietary restrictions cannot exceed 200 characters'),
  
  body('attendees.*.specialRequirements')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requirements cannot exceed 500 characters')
];

// Confirm payment validation
const confirmPaymentValidation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required')
    .isString()
    .withMessage('Payment intent ID must be a string')
];

// Cancel booking validation
const cancelBookingValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Cancellation reason must be between 5 and 500 characters')
];

// Check-in validation
const checkInValidation = [
  body('attendeeId')
    .isMongoId()
    .withMessage('Invalid attendee ID'),
  
  body('qrCode')
    .optional()
    .isString()
    .withMessage('QR code must be a string')
];

module.exports = {
  createBookingValidation,
  confirmPaymentValidation,
  cancelBookingValidation,
  checkInValidation
};
