const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests from rate limit
    skipSuccessfulRequests: false,
    // Custom key generator to include user ID if available
    keyGenerator: (req) => {
      return req.user ? `user_${req.user._id}` : req.ip;
    }
  });
};

// Different rate limits for different endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again after 15 minutes.'
);

const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests from this IP, please try again later.'
);

const bookingLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 booking attempts
  'Too many booking attempts, please try again later.'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 upload attempts
  'Too many upload attempts, please try again later.'
);

// XSS protection and input sanitization
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = mongoSanitize(req.body);
    
    // Additional XSS protection for string fields
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return xss(obj, {
          whiteList: [],
          stripIgnoreTag: false,
          stripIgnoreTag: ['script', 'style']
        });
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };
    
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = mongoSanitize(req.query);
    
    // Additional XSS protection for query params
    const sanitizedQuery = {};
    for (const key in req.query) {
      sanitizedQuery[key] = xss(req.query[key], {
        whiteList: [],
        stripIgnoreTag: false,
        stripIgnoreTag: ['script', 'style']
      });
    }
    req.query = sanitizedQuery;
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = mongoSanitize(req.params);
    
    // Additional XSS protection for params
    const sanitizedParams = {};
    for (const key in req.params) {
      sanitizedParams[key] = xss(req.params[key], {
        whiteList: [],
        stripIgnoreTag: false,
        stripIgnoreTag: ['script', 'style']
      });
    }
    req.params = sanitizedParams;
  }

  next();
};

// Helmet configuration for security headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
};

// CORS configuration for additional security
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from our frontend domain
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow no origin for mobile apps or server-to-server requests
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Input validation helper
const validateInput = (req, res, next) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>))[^<]*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  const checkSuspiciousContent = (obj) => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkSuspiciousContent(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  // Check request body
  if (req.body && checkSuspiciousContent(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  // Check query parameters
  if (req.query && checkSuspiciousContent(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  // Check URL parameters
  if (req.params && checkSuspiciousContent(req.params)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  next();
};

// IP whitelist/blacklist middleware
const ipFilter = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check whitelist if it exists
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    next();
  };
};

module.exports = {
  authLimiter,
  generalLimiter,
  bookingLimiter,
  uploadLimiter,
  sanitizeInput,
  validateInput,
  requestSizeLimiter,
  ipFilter,
  helmetConfig,
  corsOptions
};
