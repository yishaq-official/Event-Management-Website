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
const { authenticate } = require('../middleware/authMiddleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../validations/authValidation');

const router = express.Router();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerValidation, register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginValidation, login);

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', refreshToken);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, updateProfileValidation, updateProfile);

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', authenticate, updatePasswordValidation, updatePassword);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticate, logout);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
router.put('/reset-password/:resetToken', resetPasswordValidation, resetPassword);

module.exports = router;
