const express = require('express');
const {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { authenticate, authorize, checkOwnership, checkEventAccess } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');
const {
  validate,
  validateEmail,
  validatePassword
} = require('../middleware/validationMiddleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../validations/authValidation');

const router = express.Router();

// Custom validation for additional security
const enhancedRegisterValidation = [
  ...registerValidation,
  (req, res, next) => {
    const { email, password } = req.body;
    
    // Additional email validation
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Additional password validation
    if (password && !validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)'
      });
    }
    
    next();
  }
];

const enhancedLoginValidation = [
  ...loginValidation,
  (req, res, next) => {
    const { email, password } = req.body;
    
    // Additional email validation
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    next();
  }
];

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authLimiter, enhancedRegisterValidation, validate, register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, enhancedLoginValidation, validate, login);

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', validate, refreshToken);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, updateProfileValidation, validate, updateProfile);

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', authenticate, updatePasswordValidation, validate, updatePassword);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, logout);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, forgotPassword);

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
router.put('/reset-password/:resetToken', resetPasswordValidation, validate, resetPassword);

module.exports = router;
