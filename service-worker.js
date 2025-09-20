// service-worker.js
const SW_TAG = '[SW]';
function log(...args) { console.log(SW_TAG, ...args); }
function warn(...args) { console.warn(SW_TAG, ...args); }
function err(...args) { console.error(SW_TAG, ...args); }

log('service-worker loaded');

self.addEventListener('install', (evt) => {
  log('install');
  // aktifkan segera
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  log('activate');
  evt.waitUntil(clients.claim());
});

/**
 * Pesan dari halaman (postMessage)
 * - { action: 'showNow', title, body, url }
 * - { action: 'updateData', ... } -> simpan (opsional)
 * - { action: 'startDzikir' / 'stopDzikir' } -> hanya simpan state, jangan andalkan setTimeout
 */
let lastPayload = {};
self.addEventListener('message', (evt) => {
  try {
    const data = evt.data || {};
    log('message', data);
    if (data.action === 'showNow') {
      const title = data.title || 'Notifikasi';
      const options = {
        body: data.body || '',
        icon: data.icon || '/targetBaca/icon.png',
        badge: data.badge || '/targetBaca/badge.png',
        data: { url: data.url || '/' },
        tag: data.tag || undefined,
        renotify: !!data.renotify
      };
      evt.waitUntil(self.registration.showNotification(title, options));
    } else if (data.action === 'updateData') {
      lastPayload = { ...lastPayload, ...data };
    } else {
      // simpan untuk referensi
      lastPayload = { ...lastPayload, ...data };
    }
  } catch (e) {
    err('message handler error', e);
  }
});

self.addEventListener('push', (evt) => {
  log('push event', evt);
  let payload = {};
  try {
    if (evt.data) {
      payload = evt.data.json();
    }
  } catch (e) {
    payload = { body: evt.data ? evt.data.text() : '' };
  }
  const title = payload.title || 'Pengingat';
  const options = {
    body: payload.body || 'Waktunya membaca / berdzikir.',
    icon: payload.icon || '/targetBaca/icon.png',
    badge: payload.badge || '/targetBaca/badge.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'push-notif'
  };
  evt.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (evt) => {
  log('notificationclick', evt.notification && evt.notification.data);
  evt.notification.close();
  const target = (evt.notification && evt.notification.data && evt.notification.data.url) ? evt.notification.data.url : '/';
  evt.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // fokus tab yang sudah ada (dari origin yang sama) atau buka baru
      for (const c of clientList) {
        try {
          if (new URL(c.url).origin === self.location.origin) {
            if ('focus' in c) return c.focus();
          }
        } catch (e) { /* ignore */ }
      }
      if (clients.openWindow) {
        const full = (new URL(target, self.location.origin)).href;
        return clients.openWindow(full);
      }
    })
  );
});

self.addEventListener('notificationclose', (evt) => {
  log('notificationclose', evt);
});

// optional: cache fallback (simple) -- uncomment jika ingin asset caching
/* self.addEventListener('fetch', (evt) => {
  // optional caching logic
}); */
