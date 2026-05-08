const express = require('express');
const {
  uploadProfileImage,
  uploadEventBanner,
  uploadEventGallery,
  getUploadedFile,
  deleteUploadedFile,
  getUploadStats
} = require('../controllers/uploadController');
const { authenticate, authorize, checkOwnership } = require('../middleware/authMiddleware');
const { uploadLimiter } = require('../middleware/securityMiddleware');

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

// Profile image upload
router.post(
  '/profile',
  uploadLimiter,
  uploadProfileImage
);

// Event banner upload (organizer/admin only)
router.post(
  '/banner',
  authorize('organizer', 'admin'),
  uploadLimiter,
  uploadEventBanner
);

// Event gallery upload (organizer/admin only)
router.post(
  '/gallery',
  authorize('organizer', 'admin'),
  uploadLimiter,
  uploadEventGallery
);

// Serve uploaded files (public access with validation)
router.get('/file/:type/:filename', getUploadedFile);

// Delete uploaded file (with ownership validation)
router.delete('/file/:type/:filename', deleteUploadedFile);

// Upload statistics (admin only)
router.get(
  '/stats',
  authorize('admin'),
  getUploadStats
);

module.exports = router;
