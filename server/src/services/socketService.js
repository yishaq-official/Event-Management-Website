const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userSockets = new Map(); // userId -> Set of socket instances
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.io.use(async (socket, next) => {
      try {
        // Authentication middleware for socket connections
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user details
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Invalid or inactive user'));
        }

        // Attach user to socket
        socket.user = user;
        socket.userId = user._id.toString();
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.name} (${socket.userId})`);
      
      // Add user to connected users
      if (!this.connectedUsers.has(socket.userId)) {
        this.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          user: socket.user
        });
      } else {
        // User already connected, add to userSockets set
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set());
        }
        this.userSockets.get(socket.userId).add(socket.id);
      }

      // Join user-specific room for notifications
      socket.join(`user_${socket.userId}`);
      
      // Join role-based rooms
      socket.join(`role_${socket.user.role}`);
      
      // Send welcome message
      socket.emit('connected', {
        message: `Welcome back, ${socket.user.name}!`,
        user: socket.user
      });

      // Handle user status changes
      socket.on('user_status_update', async (data) => {
        try {
          await User.findByIdAndUpdate(socket.userId, data);
          socket.user = { ...socket.user, ...data };
          
          // Broadcast to user's other connections
          this.broadcastToUser(socket.userId, 'user_updated', {
            user: socket.user,
            updatedFields: Object.keys(data)
          });
        } catch (error) {
          console.error('User status update error:', error);
          socket.emit('error', { message: 'Failed to update user status' });
        }
      });

      // Handle real-time notifications
      socket.on('mark_notification_read', async (notificationId) => {
        try {
          // Mark notification as read in database
          // This would require a Notification model
          console.log(`Notification ${notificationId} marked as read by user ${socket.userId}`);
          
          socket.emit('notification_marked_read', { notificationId });
        } catch (error) {
          console.error('Mark notification read error:', error);
        }
      });

      // Handle typing indicators for chat (if implemented)
      socket.on('typing_start', (data) => {
        socket.to(`room_${data.roomId}`).broadcast.emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.name,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data) => {
        socket.to(`room_${data.roomId}`).broadcast.emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.name,
          isTyping: false
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.user.name} (${socket.userId}) - ${reason}`);
        
        // Remove from connected users
        this.removeUserConnection(socket.userId, socket.id);
        
        // Broadcast user offline status to friends/connections
        this.broadcastToUserRole(socket.user.role, 'user_offline', {
          userId: socket.userId,
          userName: socket.user.name
        });
      });
    });

    console.log('Socket.IO server initialized');
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification to all users with specific role
  sendNotificationToRole(role, notification) {
    this.io.to(`role_${role}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send notification to all connected users
  broadcastNotification(notification) {
    this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send to specific room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Broadcast to user's all connections
  broadcastToUser(userId, event, data) {
    const userConnections = this.userSockets.get(userId);
    if (userConnections) {
      userConnections.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Broadcast to all users with specific role
  broadcastToUserRole(role, event, data) {
    this.io.to(`role_${role}`).emit(event, data);
  }

  // Remove user connection
  removeUserConnection(userId, socketId) {
    const userConnections = this.userSockets.get(userId);
    if (userConnections) {
      userConnections.delete(socketId);
      
      // If no more connections, remove from connected users
      if (userConnections.size === 0) {
        this.connectedUsers.delete(userId);
        this.userSockets.delete(userId);
      }
    }
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Get online users by role
  getOnlineUsersByRole(role) {
    const onlineUsers = [];
    this.connectedUsers.forEach((userData, userId) => {
      if (userData.user.role === role) {
        onlineUsers.push({
          userId,
          name: userData.user.name,
          email: userData.user.email,
          avatar: userData.user.profileImage,
          socketId: userData.socketId
        });
      }
    });
    return onlineUsers;
  }

  // Real-time event updates
  broadcastEventUpdate(eventId, updateType, data) {
    // Send to all users interested in this event
    this.io.emit('event_update', {
      eventId,
      updateType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time booking updates
  broadcastBookingUpdate(bookingId, updateType, data) {
    // Send to organizer and user
    const booking = this.connectedUsers.get(bookingId);
    if (booking) {
      this.sendNotificationToUser(bookingId, {
        type: 'booking_update',
        updateType,
        data,
        timestamp: new Date().toISOString()
      });
    }
    
    // Also broadcast to organizers
    this.broadcastToUserRole('organizer', 'booking_update', {
      bookingId,
      updateType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time chat messages (for event chat rooms)
  sendChatMessage(roomId, message) {
    const chatMessage = {
      id: Date.now().toString(),
      roomId,
      message,
      sender: this.getUserBySocketId(this.io.sockets.sockets.get(roomId)),
      timestamp: new Date().toISOString()
    };
    
    this.sendToRoom(roomId, 'chat_message', chatMessage);
  }

  // Helper method to get user by socket ID
  getUserBySocketId(socket) {
    return socket ? socket.user : null;
  }

  // Get connection statistics
  getStats() {
    return {
      connectedUsers: this.getOnlineUsersCount(),
      connections: this.io ? this.io.engine.clientsCount : 0,
      rooms: this.io ? this.io.sockets.adapter.rooms.size : 0
    };
  }
}

module.exports = new SocketService();
