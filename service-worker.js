// Service Worker — perbaikan kecil & lebih tahan banting
console.log('Service Worker dimuat.');

// Install -> aktif segera
self.addEventListener('install', (event) => {
  console.log('Service Worker: event install');
  self.skipWaiting();
});

// Activate -> klaim klien
self.addEventListener('activate', (event) => {
  console.log('Service Worker: event activate');
  event.waitUntil(clients.claim());
});

// Terima pesan dari halaman utama
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    console.log('Service Worker: menerima pesan dari halaman utama:', data);
    const { action, namaUser, kekuranganTarget, isTargetTercapai } = data;

    if (action === 'showNotification') {
      // safety-guard: jika target tercapai atau kekurangan <= 0, tidak tampilkan
      if (isTargetTercapai) {
        console.log('Service Worker: target tercapai — skip notifikasi.');
        return;
      }
      if (!kekuranganTarget || Number(kekuranganTarget) <= 0) {
        console.log('Service Worker: kekuranganTarget <= 0 — skip notifikasi.');
        return;
      }

      const title = "Pengingat Bacaan Al-Qur'an";
      const namaPengguna = namaUser ? `${namaUser}, ` : '';
      const options = {
        body: `${namaPengguna}Anda masih perlu membaca ${kekuranganTarget} halaman lagi untuk mencapai target harian.`,
        icon: 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        silent: false,
        vibrate: [200, 100, 200],
        data: { url: '/' } // simpan data jika ingin membuka URL spesifik saat klik
      };

      // Tampilkan notifikasi (tangkap error agar SW tidak crash)
      try {
        self.registration.showNotification(title, options);
      } catch (err) {
        console.error('Gagal menampilkan notifikasi lewat registration.showNotification:', err);
      }
    }
  } catch (err) {
    console.error('Terjadi error pada event.message di SW:', err);
  }
});

// Saat notifikasi diklik
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notifikasi diklik.');
  event.notification.close();

  // URL tujuan bisa berasal dari event.notification.data, fallback ke '/'
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  // Coba fokuskan tab yang sesuai; jika tidak ada, buka tab baru
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // cari client yang url-nya di origin yang sama dan yang mungkin cocok
      for (const client of clientList) {
        // Anda bisa perkuat logika pencocokan (mis. client.url.includes('/app'))
        try {
          if (client.url && new URL(client.url).origin === self.location.origin) {
            if ('focus' in client) {
              return client.focus();
            }
          }
        } catch (e) {
          // jika parsing URL error, lanjutkan ke client berikutnya
          console.warn('Error ketika memeriksa client.url:', e);
        }
      }

      // Jika tidak ada client yang bisa difokuskan, buka tab baru ke targetUrl
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
