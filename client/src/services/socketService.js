import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.user = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.connected = true;
      this.emit('socket_connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason);
      this.connected = false;
      this.emit('socket_disconnected', { reason });
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      this.emit('socket_error', error);
    });

    this.socket.on('connected', (data) => {
      console.log('Socket connection confirmed:', data);
      this.user = data.user;
      this.emit('user_connected', data);
    });

    // Real-time notifications
    this.socket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      this.handleNotification(notification);
      this.emit('notification_received', notification);
    });

    // Event updates
    this.socket.on('event_update', (data) => {
      console.log('Event update:', data);
      this.emit('event_updated', data);
    });

    // Booking updates
    this.socket.on('booking_update', (data) => {
      console.log('Booking update:', data);
      this.emit('booking_updated', data);
    });

    // User status updates
    this.socket.on('user_updated', (data) => {
      console.log('User updated:', data);
      this.emit('user_status_updated', data);
    });

    // User online/offline status
    this.socket.on('user_online', (data) => {
      console.log('User online:', data);
      this.emit('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('User offline:', data);
      this.emit('user_offline', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    // Chat messages
    this.socket.on('chat_message', (message) => {
      console.log('Chat message:', message);
      this.emit('chat_message_received', message);
    });

    // Notification marked as read
    this.socket.on('notification_marked_read', (data) => {
      this.emit('notification_read', data);
    });
  }

  handleNotification(notification) {
    // Show toast notification based on type
    switch (notification.type) {
      case 'booking_confirmed':
        toast.success(`Booking confirmed: ${notification.title}`);
        break;
      case 'booking_cancelled':
        toast.error(`Booking cancelled: ${notification.title}`);
        break;
      case 'event_approved':
        toast.success(`Event approved: ${notification.title}`);
        break;
      case 'event_rejected':
        toast.error(`Event rejected: ${notification.title}`);
        break;
      case 'new_message':
        toast(`New message: ${notification.title}`);
        break;
      case 'user_status_update':
        toast.info(`Status update: ${notification.title}`);
        break;
      default:
        toast(notification.title);
    }

    // Play notification sound (if enabled)
    if (this.isNotificationSoundEnabled()) {
      this.playNotificationSound();
    }

    // Show browser notification if permission granted
    if (this.isBrowserNotificationSupported()) {
      this.showBrowserNotification(notification);
    }
  }

  // Emit events to server
  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }

  // Listen to custom events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Trigger local event listeners
  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event listener:', error);
        }
      });
    }
  }

  // Update user status
  updateUserStatus(status) {
    this.emit('user_status_update', status);
  }

  // Start typing
  startTyping(roomId) {
    this.emit('typing_start', { roomId });
  }

  // Stop typing
  stopTyping(roomId) {
    this.emit('typing_stop', { roomId });
  }

  // Join room
  joinRoom(roomId) {
    this.emit('join_room', { roomId });
  }

  // Leave room
  leaveRoom(roomId) {
    this.emit('leave_room', { roomId });
  }

  // Mark notification as read
  markNotificationRead(notificationId) {
    this.emit('mark_notification_read', notificationId);
  }

  // Send chat message
  sendChatMessage(roomId, message) {
    this.emit('chat_message', { roomId, message });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  // Check if socket is connected
  isConnected() {
    return this.connected;
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Browser notification helpers
  isBrowserNotificationSupported() {
    return 'Notification' in window;
  }

  requestNotificationPermission() {
    if (this.isBrowserNotificationSupported()) {
      Notification.requestPermission();
    }
  }

  showBrowserNotification(notification) {
    if (this.isBrowserNotificationSupported() && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        if (browserNotification) {
          browserNotification.close();
        }
      }, 5000);
    }
  }

  // Notification sound
  isNotificationSoundEnabled() {
    return localStorage.getItem('notificationSoundEnabled') !== 'false';
  }

  playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Could not create audio element:', error);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.connected,
      user: this.user,
      socketId: this.socket?.id
    };
  }

  // Reconnect
  reconnect(token) {
    this.disconnect();
    setTimeout(() => {
      this.connect(token);
    }, 1000);
  }

  // Clean up
  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.user = null;
    this.listeners.clear();
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
