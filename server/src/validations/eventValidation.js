const { body } = require('express-validator');

// Create event validation
const createEventValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Event description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('category')
    .isIn(['tech', 'music', 'business', 'sports', 'education', 'gaming', 'art', 'food', 'health', 'other'])
    .withMessage('Invalid category'),
  
  body('eventType')
    .isIn(['online', 'offline', 'hybrid'])
    .withMessage('Event type must be online, offline, or hybrid'),
  
  body('date.startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),
  
  body('date.endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.date.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('time.startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('time.endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  
  body('capacity')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be between 1 and 100000'),
  
  body('banner')
    .isURL()
    .withMessage('Banner must be a valid URL'),
  
  body('location.venue')
    .if(body('eventType').equals('offline'))
    .notEmpty()
    .withMessage('Venue is required for offline events'),
  
  body('location.address.city')
    .if(body('eventType').equals('offline'))
    .notEmpty()
    .withMessage('City is required for offline events'),
  
  body('location.address.country')
    .notEmpty()
    .withMessage('Country is required'),
  
  body('tickets')
    .isArray({ min: 1 })
    .withMessage('At least one ticket type is required'),
  
  body('tickets.*.type')
    .isIn(['free', 'standard', 'vip', 'early-bird'])
    .withMessage('Invalid ticket type'),
  
  body('tickets.*.name')
    .trim()
    .notEmpty()
    .withMessage('Ticket name is required'),
  
  body('tickets.*.price')
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be at least 0'),
  
  body('tickets.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Ticket quantity must be at least 1'),
  
  body('tickets.*.available')
    .isInt({ min: 0 })
    .withMessage('Available tickets cannot be negative')
];

// Update event validation
const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('category')
    .optional()
    .isIn(['tech', 'music', 'business', 'sports', 'education', 'gaming', 'art', 'food', 'health', 'other'])
    .withMessage('Invalid category'),
  
  body('eventType')
    .optional()
    .isIn(['online', 'offline', 'hybrid'])
    .withMessage('Event type must be online, offline, or hybrid'),
  
  body('date.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),
  
  body('date.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.date.startDate && new Date(value) <= new Date(req.body.date.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('time.startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('time.endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be between 1 and 100000'),
  
  body('banner')
    .optional()
    .isURL()
    .withMessage('Banner must be a valid URL'),
  
  body('location.venue')
    .if(body('eventType').equals('offline'))
    .optional()
    .notEmpty()
    .withMessage('Venue is required for offline events'),
  
  body('location.address.city')
    .if(body('eventType').equals('offline'))
    .optional()
    .notEmpty()
    .withMessage('City is required for offline events'),
  
  body('location.address.country')
    .optional()
    .notEmpty()
    .withMessage('Country is required'),
  
  body('tickets')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one ticket type is required'),
  
  body('tickets.*.type')
    .optional()
    .isIn(['free', 'standard', 'vip', 'early-bird'])
    .withMessage('Invalid ticket type'),
  
  body('tickets.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Ticket name is required'),
  
  body('tickets.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be at least 0'),
  
  body('tickets.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ticket quantity must be at least 1'),
  
  body('tickets.*.available')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available tickets cannot be negative')
];

// Update event status validation (Admin only)
const updateEventStatusValidation = [
  body('status')
    .isIn(['approved', 'rejected', 'cancelled'])
    .withMessage('Status must be approved, rejected, or cancelled'),
  
  body('rejectionReason')
    .if(body('status').equals('rejected'))
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting an event')
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters')
];

module.exports = {
  createEventValidation,
  updateEventValidation,
  updateEventStatusValidation
};
