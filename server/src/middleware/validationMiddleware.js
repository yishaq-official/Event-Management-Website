const { validationResult } = require('express-validator');

// Generic validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Custom validation for specific fields
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\#]).{8,}$/;
  return passwordRegex.test(password);
};

const validatePhone = (phone) => {
  // International phone number format
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateDate = (dateString, isFuture = false) => {
  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return false;
  }
  
  if (isFuture && date <= now) {
    return false;
  }
  
  if (!isFuture && date < now) {
    return false;
  }
  
  return true;
};

const validateObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Sanitize and validate user input
const sanitizeInput = (input, type = 'string') => {
  if (!input) return '';
  
  switch (type) {
    case 'string':
      return typeof input === 'string' ? input.trim() : String(input).trim();
    case 'email':
      return validateEmail(input) ? input.toLowerCase().trim() : '';
    case 'phone':
      return validatePhone(input) ? input : '';
    case 'url':
      return validateURL(input) ? input : '';
    case 'number':
      const num = parseFloat(input);
      return isNaN(num) ? 0 : num;
    case 'integer':
      const int = parseInt(input);
      return isNaN(int) ? 0 : int;
    default:
      return input;
  }
};

// Validate file upload
const validateFile = (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: `File type ${file.mimetype} not allowed` };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB` };
  }
  
  return { valid: true };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const maxLimit = 100;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > maxLimit) {
    return res.status(400).json({
      success: false,
      message: `Limit must be between 1 and ${maxLimit}`
    });
  }
  
  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };
  
  next();
};

// Validate sort parameters
const validateSort = (req, res, next, allowedFields = []) => {
  const { sort, order = 'asc' } = req.query;
  const allowedOrders = ['asc', 'desc'];
  
  if (sort && allowedFields.length > 0 && !allowedFields.includes(sort)) {
    return res.status(400).json({
      success: false,
      message: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
    });
  }
  
  if (!allowedOrders.includes(order)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sort order. Must be asc or desc'
    });
  }
  
  req.sort = { field: sort, order };
  next();
};

// Validate date range
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !validateDate(startDate)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start date format'
    });
  }
  
  if (endDate && !validateDate(endDate)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end date format'
    });
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }
    
    // Limit date range to 1 year
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end - start > maxRange) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 1 year'
      });
    }
  }
  
  req.dateRange = { startDate, endDate };
  next();
};

// Check for SQL injection patterns
const detectSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|WHERE)\b)/gi,
    /(--|;|\/\*|'|\"|\|\/)/g,
    /\b(OR|AND)\s+\d+\s*=\s*\d+/gi,
    /\b(OR|AND)\s+\w+\s*=\s*['\"][^'\"]*['\"]/gi,
    /(\b(UNION|JOIN)\b)/gi,
    /(\b(FROM|INTO)\b)/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// SQL injection protection middleware
const protectFromSQLInjection = (req, res, next) => {
  const checkFields = ['query', 'params', 'body'];
  
  for (const field of checkFields) {
    if (req[field]) {
      const fieldStr = JSON.stringify(req[field]);
      if (detectSQLInjection(fieldStr)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input detected'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  validate,
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL,
  validateObjectId,
  sanitizeInput,
  validateFile,
  validatePagination,
  validateSort,
  validateDateRange,
  protectFromSQLInjection
};
