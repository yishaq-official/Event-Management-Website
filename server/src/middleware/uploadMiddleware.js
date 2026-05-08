const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { validateFile } = require('./validationMiddleware');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories
const subdirs = ['events', 'profiles', 'banners'];
subdirs.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure multer for different upload types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Determine destination based on upload type
    if (req.uploadType === 'profile') {
      uploadPath = path.join(uploadPath, 'profiles');
    } else if (req.uploadType === 'banner') {
      uploadPath = path.join(uploadPath, 'banners');
    } else if (req.uploadType === 'event') {
      uploadPath = path.join(uploadPath, 'events');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  
  const allowedMimes = [...allowedTypes.image, ...allowedTypes.document];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files per request
  }
});

// Image processing middleware
const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const { file } = req;
    const filePath = file.path;
    const filename = file.filename;
    const ext = path.extname(filename);
    const baseName = filename.replace(ext, '');
    
    // Process different sizes for images
    if (file.mimetype.startsWith('image/')) {
      const processedDir = path.dirname(filePath);
      
      // Original size
      await sharp(filePath)
        .jpeg({ quality: 90 })
        .toFile(path.join(processedDir, `${baseName}-original.jpg`));
      
      // Thumbnail (150x150)
      await sharp(filePath)
        .resize(150, 150, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(path.join(processedDir, `${baseName}-thumb.jpg`));
      
      // Medium (500x500)
      await sharp(filePath)
        .resize(500, 500, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toFile(path.join(processedDir, `${baseName}-medium.jpg`));
      
      // Large (1200x630 for social sharing)
      await sharp(filePath)
        .resize(1200, 630, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(path.join(processedDir, `${baseName}-large.jpg`));
      
      // Update file info with processed versions
      req.processedFile = {
        original: `${baseName}-original.jpg`,
        thumbnail: `${baseName}-thumb.jpg`,
        medium: `${baseName}-medium.jpg`,
        large: `${baseName}-large.jpg`,
        originalName: filename,
        path: filePath,
        size: file.size,
        mimetype: file.mimetype
      };
      
      // Remove original file after processing
      fs.unlinkSync(filePath);
    }
    
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing image'
    });
  }
};

// Multiple file processing
const processMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const processedFiles = [];
    
    for (const file of req.files) {
      const filePath = file.path;
      const filename = file.filename;
      const ext = path.extname(filename);
      const baseName = filename.replace(ext, '');
      
      if (file.mimetype.startsWith('image/')) {
        const processedDir = path.dirname(filePath);
        
        // Process each image
        await sharp(filePath)
          .jpeg({ quality: 90 })
          .toFile(path.join(processedDir, `${baseName}-processed.jpg`));
        
        processedFiles.push({
          original: filename,
          processed: `${baseName}-processed.jpg`,
          path: filePath,
          size: file.size,
          mimetype: file.mimetype
        });
        
        // Remove original file after processing
        fs.unlinkSync(filePath);
      }
    }
    
    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    console.error('Multiple image processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing images'
    });
  }
};

// File validation middleware
const validateUpload = (req, res, next) => {
  try {
    // Set upload type from request
    req.uploadType = req.path.includes('profile') ? 'profile' : 
                    req.path.includes('banner') ? 'banner' : 'event';
    
    if (req.file) {
      const validation = validateFile(req.file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 5 * 1024 * 1024);
      
      if (!validation.valid) {
        // Remove uploaded file if validation fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
    }
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const validation = validateFile(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 5 * 1024 * 1024);
        
        if (!validation.valid) {
          // Remove uploaded file if validation fails
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Upload validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating upload'
    });
  }
};

// Cleanup old files (run periodically)
const cleanupOldFiles = (maxAge = 7 * 24 * 60 * 60 * 1000) => { // 7 days
  const directories = ['profiles', 'banners', 'events'];
  
  directories.forEach(dir => {
    const dirPath = path.join(uploadsDir, dir);
    
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      const now = Date.now();
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        // Remove files older than maxAge
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      });
    }
  });
};

// Get file info
const getFileInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      exists: true
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

// Delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File does not exist' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Serve file with proper headers
const serveFile = (filePath, res) => {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const stats = fs.statSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Set content type based on file extension
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    }[fileExt] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};

module.exports = {
  upload,
  processImage,
  processMultipleImages,
  validateUpload,
  cleanupOldFiles,
  getFileInfo,
  deleteFile,
  serveFile,
  uploadsDir
};
