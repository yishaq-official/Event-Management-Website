const { body } = require('express-validator');

// Create review validation
const createReviewValidation = [
  body('eventId')
    .isMongoId()
    .withMessage('Invalid event ID'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
    .escape()
];

// Update review validation
const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters')
    .escape(),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
    .escape()
];

// Report review validation
const reportReviewValidation = [
  body('reason')
    .trim()
    .isIn(['spam', 'inappropriate', 'offensive', 'fake', 'duplicate'])
    .withMessage('Invalid report reason'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape()
];

module.exports = {
  createReviewValidation,
  updateReviewValidation,
  reportReviewValidation
};
