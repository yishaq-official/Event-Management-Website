const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');

// Import security middleware
const {
  generalLimiter,
  authLimiter,
  bookingLimiter,
  sanitizeInput,
  validateInput,
  requestSizeLimiter,
  helmetConfig,
  corsOptions
} = require('./src/middleware/securityMiddleware');

// Import routes and services
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const SocketService = require('./src/services/socketService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting and input sanitization
app.use('/api/auth', authLimiter);
app.use('/api/bookings', bookingLimiter);
app.use(generalLimiter);
app.use(sanitizeInput);
app.use(validateInput);
app.use(requestSizeLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// MongoDB connection
require('./src/config/db');

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Event Management API Server is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});

// Initialize Socket.IO
SocketService.initialize(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
