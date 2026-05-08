const CACHE_NAME = 'eventhub-v1';
const urlsToCache = [
  '/',
  '/events',
  '/my-bookings',
  '/organizer/create-event',
  '/organizer/dashboard',
  '/admin/dashboard',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Cached all files');
        self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
    })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (event.request.method === 'GET' && response.status === 200) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, response.clone()));
          }
          
          return response;
        }).catch(error => {
          console.error('Fetch failed:', error);
          return new Response('Network error', {
            status: 500,
            statusText: 'Network Error'
          });
        });
      })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const options = {
    body: event.data.body,
    icon: '/icons/icon-96x96.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: event.data.data,
    actions: [
      {
        action: 'explore',
        title: 'Explore Events',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(event.data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Handle notification clicks
  if (event.action === 'explore') {
    clients.openWindow('/events');
  } else if (event.action === 'view') {
    clients.openWindow(event.notification.data.url || '/events');
  } else {
    clients.openWindow('/events');
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

// Sync offline bookings
const syncBookings = async () => {
  try {
    // Get all pending bookings from IndexedDB
    const pendingBookings = await getPendingBookings();
    
    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify(booking)
        });
        
        if (response.ok) {
          await removePendingBooking(booking.id);
          console.log('Synced booking:', booking.id);
        }
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
};

// IndexedDB helpers for offline storage
const getPendingBookings = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EventHubDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingBookings'], 'readonly');
      const store = transaction.objectStore('pendingBookings');
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => reject(getAllRequest.error);
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    };
  });
};

const removePendingBooking = (bookingId) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EventHubDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingBookings'], 'readwrite');
      const store = transaction.objectStore('pendingBookings');
      const deleteRequest = store.delete(bookingId);
      
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    };
  });
};

const getAuthToken = () => {
  return new Promise((resolve) => {
    const request = indexedDB.open('EventHubDB', 1);
    
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['auth'], 'readonly');
      const store = transaction.objectStore('auth');
      const getRequest = store.get('token');
      
      getRequest.onerror = () => resolve(null);
      getRequest.onsuccess = () => resolve(getRequest.result?.value);
    };
  });
};

// Periodic cache cleanup
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_CLEANUP') {
    cleanupCache();
  }
});

const cleanupCache = () => {
  caches.open(CACHE_NAME).then(cache => {
    return cache.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (!urlsToCache.includes(key)) {
            return cache.delete(key);
          }
        })
      );
    });
  });
};

// Periodic cleanup every 24 hours
setInterval(cleanupCache, 24 * 60 * 60 * 1000);
