const { upload, processImage, processMultipleImages, serveFile, deleteFile, validateUpload } = require('../middleware/uploadMiddleware');
const User = require('../models/User');
const Event = require('../models/Event');

// @desc    Upload profile image
// @route   POST /api/upload/profile
// @access  Private
const uploadProfileImage = async (req, res, next) => {
  try {
    req.uploadType = 'profile';
    validateUpload(req, res, () => {
      upload.single('profile')(req, res, async () => {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        processImage(req, res, async () => {
          if (!req.processedFile) {
            return res.status(500).json({
              success: false,
              message: 'Image processing failed'
            });
          }

          // Update user profile
          const user = await User.findByIdAndUpdate(
            req.user._id,
            { profileImage: `/uploads/profiles/${req.processedFile.medium}` },
            { new: true, runValidators: true }
          ).select('-password');

          res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully',
            profileImage: `/uploads/profiles/${req.processedFile.medium}`,
            processedFile: req.processedFile
          });
        });
      });
    });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading profile image'
    });
  }
};

// @desc    Upload event banner
// @route   POST /api/upload/banner
// @access  Private (Organizer/Admin)
const uploadEventBanner = async (req, res, next) => {
  try {
    req.uploadType = 'banner';
    validateUpload(req, res, () => {
      upload.single('banner')(req, res, async () => {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded'
          });
        }

        processImage(req, res, async () => {
          if (!req.processedFile) {
            return res.status(500).json({
              success: false,
              message: 'Image processing failed'
            });
          }

          // Update event banner
          const { eventId } = req.body;
          
          if (!eventId) {
            return res.status(400).json({
              success: false,
              message: 'Event ID is required'
            });
          }

          const event = await Event.findByIdAndUpdate(
            eventId,
            { banner: `/uploads/banners/${req.processedFile.large}` },
            { new: true, runValidators: true }
          );

          if (!event) {
            return res.status(404).json({
              success: false,
              message: 'Event not found'
            });
          }

          res.status(200).json({
            success: true,
            message: 'Event banner uploaded successfully',
            banner: `/uploads/banners/${req.processedFile.large}`,
            processedFile: req.processedFile
          });
        });
      });
    });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading event banner'
    });
  }
};

// @desc    Upload event gallery images
// @route   POST /api/upload/gallery
// @access  Private (Organizer/Admin)
const uploadEventGallery = async (req, res, next) => {
  try {
    req.uploadType = 'event';
    validateUpload(req, res, () => {
      upload.array('gallery', 5)(req, res, async () => {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No files uploaded'
          });
        }

        processMultipleImages(req, res, async () => {
          if (!req.processedFiles) {
            return res.status(500).json({
              success: false,
              message: 'Image processing failed'
            });
          }

          // Update event gallery
          const { eventId } = req.body;
          
          if (!eventId) {
            return res.status(400).json({
              success: false,
              message: 'Event ID is required'
            });
          }

          const galleryImages = req.processedFiles.map(file => `/uploads/events/${file.processed}`);
          
          const event = await Event.findByIdAndUpdate(
            eventId,
            { 
              $push: { gallery: galleryImages }
            },
            { new: true, runValidators: true }
          );

          if (!event) {
            return res.status(404).json({
              success: false,
              message: 'Event not found'
            });
          }

          res.status(200).json({
            success: true,
            message: 'Gallery images uploaded successfully',
            gallery: galleryImages,
            processedFiles: req.processedFiles
          });
        });
      });
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading gallery images'
    });
  }
};

// @desc    Get uploaded file
// @route   GET /api/upload/file/:type/:filename
// @access  Public (with validation)
const getUploadedFile = async (req, res, next) => {
  try {
    const { type, filename } = req.params;
    
    // Validate file type
    const allowedTypes = ['profiles', 'banners', 'events'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    // Construct file path
    const filePath = require('path').join(__dirname, '../../uploads', type, filename);
    serveFile(filePath, res);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error serving file'
    });
  }
};

// @desc    Delete uploaded file
// @route   DELETE /api/upload/file/:type/:filename
// @access  Private (with ownership validation)
const deleteUploadedFile = async (req, res, next) => {
  try {
    const { type, filename } = req.params;
    
    // Validate file type
    const allowedTypes = ['profiles', 'banners', 'events'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type'
      });
    }

    // Construct file path
    const filePath = require('path').join(__dirname, '../../uploads', type, filename);
    const result = deleteFile(filePath);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    // Update database to remove file reference
    if (type === 'profiles') {
      await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { profileImage: 1 } },
        { new: true }
      );
    } else if (type === 'banners') {
      // Find event with this banner and remove it
      await Event.updateOne(
        { banner: `/uploads/banners/${filename}` },
        { $unset: { banner: 1 } }
      );
    } else if (type === 'events') {
      // Find event with this gallery image and remove it
      await Event.updateOne(
        { gallery: `/uploads/events/${filename}` },
        { $pull: { gallery: `/uploads/events/${filename}` } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting file'
    });
  }
};

// @desc    Get upload statistics
// @route   GET /api/upload/stats
// @access  Private (Admin)
const getUploadStats = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    const stats = {
      profiles: { count: 0, size: 0 },
      banners: { count: 0, size: 0 },
      events: { count: 0, size: 0 }
    };

    // Calculate stats for each directory
    const directories = ['profiles', 'banners', 'events'];
    directories.forEach(dir => {
      const dirPath = path.join(uploadsDir, dir);
      
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        let totalSize = 0;
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const fileStats = fs.statSync(filePath);
          totalSize += fileStats.size;
        });
        
        stats[dir] = {
          count: files.length,
          size: totalSize,
          sizeFormatted: formatFileSize(totalSize)
        };
      }
    });

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Upload stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching upload statistics'
    });
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  uploadProfileImage,
  uploadEventBanner,
  uploadEventGallery,
  getUploadedFile,
  deleteUploadedFile,
  getUploadStats
};
