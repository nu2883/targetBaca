// service-worker.js (improved)
// Letakkan file ini di root situs (mis. /targetBaca/service-worker.js)

const SW_TAG = '[SW]';

function log(...args) { console.log(SW_TAG, ...args); }
function warn(...args) { console.warn(SW_TAG, ...args); }
function err(...args) { console.error(SW_TAG, ...args); }

log('loaded');

/**
 * Install -> langsung aktifkan versi baru
 */
self.addEventListener('install', (event) => {
  log('install');
  // aktif segera
  self.skipWaiting();
});

/**
 * Activate -> klaim clients supaya SW langsung mengontrol halaman yang terbuka
 */
self.addEventListener('activate', (event) => {
  log('activate');
  event.waitUntil(clients.claim());
});

/**
 * Push -> untuk Web Push (server) — jika nanti pakai push, SW akan menampilkan notifikasi
 */
self.addEventListener('push', (event) => {
  log('push event received');
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    try { data = { body: event.data && event.data.text() }; } catch(e2) {}
  }

  const title = data.title || 'Pengingat';
  const body = data.body || (data.namaUser ? `${data.namaUser}, ingatlah kepada Alloh` : 'Ingatlah kepada Alloh');
  const url = (data.url || '/');
  const options = {
    body,
    icon: data.icon || 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
    badge: data.badge || 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
    data: { url },
    vibrate: [200,100,200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => log('push -> showNotification succeeded:', title))
      .catch(e => err('push -> showNotification failed:', e))
  );
});

/**
 * Message -> menerima postMessage dari halaman
 * Diharapkan payload minimal: { action: 'showNotification', title?, body?, namaUser?, url? }
 */
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    log('message received:', data);

    const action = data.action || '';
    if (action === 'showNotification') {
      const title = data.title || "Pengingat Bacaan Al-Qur'an";
      const body = data.body || (data.namaUser ? `${data.namaUser}, ingatlah kepada Alloh` : 'Ingatlah kepada Alloh');
      const url = data.url || '/';
      const options = {
        body,
        icon: data.icon || 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: data.badge || 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        data: { url },
        vibrate: [200,100,200]
      };

      // Gunakan event.waitUntil jika tersedia (kadang tidak pada message)
      try {
        event.waitUntil(
          self.registration.showNotification(title, options)
            .then(() => log('message -> showNotification succeeded:', title))
            .catch(e => err('message -> showNotification failed:', e))
        );
      } catch (e) {
        // fallback jika event.waitUntil tidak didukung pada message event
        Promise.resolve().then(() => self.registration.showNotification(title, options))
          .then(() => log('message -> showNotification succeeded (fallback):', title))
          .catch(e => err('message -> showNotification failed (fallback):', e));
      }

      return;
    }

    if (action === 'stopNotifications') {
      // placeholder: client-side yang mengelola interval harus menghentikan dirinya sendiri
      log('received stopNotifications');
      return;
    }

    log('unknown action:', action);
  } catch (e) {
    err('error in message handler:', e);
  }
});

/**
 * notificationclick -> fokus/open client dan buka url dari notification.data
 */
self.addEventListener('notificationclick', (event) => {
  log('notificationclick', event.notification && event.notification.data);
  event.notification.close();

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // coba fokus client yang sama origin
      for (const client of clientList) {
        try {
          const clientUrl = client.url || '';
          if (new URL(clientUrl).origin === self.location.origin) {
            if ('focus' in client) {
              log('focusing existing client:', clientUrl);
              return client.focus();
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
      // jika tidak ada, buka tab baru
      if (clients.openWindow) {
        const full = (new URL(targetUrl, location.origin)).href;
        log('opening new window to', full);
        return clients.openWindow(full);
      }
    })
  );
});

/**
 * notificationclose -> log (opsional)
 */
self.addEventListener('notificationclose', (event) => {
  log('notificationclose', event.notification && event.notification.data);
});

/**
 * (Opsional) fetch handler sederhana — pasang cache-first untuk GET (bisa dikembangkan)
 * Jika tidak mau interception, hapus event listener ini.
 */
self.addEventListener('fetch', (event) => {
  // Hanya handle GET pada same-origin requests untuk mengurangi dampak
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // contoh cache-first ringan
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        // salin response ke cache runtime (opsional)
        const cloned = resp.clone();
        caches.open('runtime-v1').then(cache => {
          cache.put(event.request, cloned).catch(err => warn('cache put failed:', err));
        });
        return resp;
      }).catch(() => {
        // fallback sederhana ketika offline (bisa kustom)
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
