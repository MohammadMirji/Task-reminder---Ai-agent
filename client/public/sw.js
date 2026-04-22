/* eslint-disable no-restricted-globals */
// This file runs in the background even when the tab is closed

self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo192.png',
      badge: data.badge || '/logo192.png',
      vibrate: [200, 100, 200], // vibration pattern for mobile
      data: { taskId: data.taskId },
      actions: [
        { action: 'view', title: '📋 View Task' },
        { action: 'dismiss', title: '✖ Dismiss' },
      ],
    })
  );
});

// When user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('http://localhost:3000')
    );
  }
});