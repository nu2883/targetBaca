// service-worker.js - Kode yang telah dioptimalkan untuk GitHub Pages

const SW_TAG = '[SW]';

function log(...args) {
    console.log(SW_TAG, ...args);
}
function warn(...args) {
    console.warn(SW_TAG, ...args);
}
function err(...args) {
    console.error(SW_TAG, ...args);
}

// Variabel untuk menyimpan data notifikasi (sementara saat SW aktif)
let notificationPayload = {};
let dzikirIntervalId = null;

log('loaded');

/**
 * Install -> Langsung aktifkan versi baru
 */
self.addEventListener('install', (event) => {
    log('install');
    self.skipWaiting();
});

/**
 * Activate -> Klaim clients supaya SW langsung mengontrol halaman yang terbuka
 */
self.addEventListener('activate', (event) => {
    log('activate');
    event.waitUntil(clients.claim());
});

/**
 * Message -> Menerima postMessage dari halaman web
 * Diharapkan payload minimal: { action: 'showNotification', title?, body?, namaUser?, url?, kekuranganTarget?, dzikirMenit? }
 */
self.addEventListener('message', (event) => {
    try {
        const data = event.data || {};
        log('message received:', data);

        const action = data.action || '';
        
        // Simpan data payload terbaru
        notificationPayload = { ...data };

        if (action === 'showReadingNotification') {
            showReadingNotification();
        } else if (action === 'startDzikir') {
            startDzikir();
        } else if (action === 'stopDzikir') {
            stopDzikir();
        } else {
            log('unknown action:', action);
        }
    } catch (e) {
        err('error in message handler:', e);
    }
});

/**
 * notificationclick -> Fokus/buka client dan buka url dari notification.data
 */
self.addEventListener('notificationclick', (event) => {
    log('notificationclick', event.notification && event.notification.data);
    event.notification.close();

    const targetUrl = (event.notification && event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
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
                    // Ignore parse errors
                }
            }
            if (clients.openWindow) {
                const full = (new URL(targetUrl, location.origin)).href;
                log('opening new window to', full);
                return clients.openWindow(full);
            }
        })
    );
});

/**
 * notificationclose -> Log (opsional)
 */
self.addEventListener('notificationclose', (event) => {
    log('notificationclose', event.notification && event.notification.data);
});

/**
 * Fungsi untuk menampilkan notifikasi bacaan.
 * Data diambil dari variabel global `notificationPayload` yang diperbarui oleh `message` event.
 */
function showReadingNotification() {
    const { namaUser, kekuranganTarget } = notificationPayload;

    const title = "Pengingat Bacaan Al-Qur'an";
    const namaPengguna = namaUser ? `${namaUser}, ` : '';
    const body = kekuranganTarget ?
        `${namaPengguna}Anda masih perlu membaca ${kekuranganTarget} halaman lagi untuk mencapai target harian.` :
        `${namaPengguna}Saatnya kembali membaca Al-Qur'an.`;

    const options = {
        body,
        icon: 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        data: { url: notificationPayload.url || '/' },
        vibrate: [200, 100, 200]
    };

    self.registration.showNotification(title, options)
        .then(() => log('showReadingNotification succeeded:', title))
        .catch(e => err('showReadingNotification failed:', e));
}

/**
 * Fungsi untuk memulai pengingat dzikir
 * Menggunakan setInterval, jadi hanya akan berfungsi saat halaman aktif.
 */
function startDzikir() {
    stopDzikir();
    const ms = Math.max(1, notificationPayload.dzikirMenit || 5) * 60 * 1000;
    showDzikirNotification();
    dzikirIntervalId = setInterval(() => {
        showDzikirNotification();
    }, ms);
    log(`Pengingat dzikir dimulai setiap ${ms / 60000} menit.`);
}

/**
 * Fungsi untuk menghentikan pengingat dzikir
 */
function stopDzikir() {
    if (dzikirIntervalId) {
        clearInterval(dzikirIntervalId);
        dzikirIntervalId = null;
        log('Pengingat dzikir dihentikan.');
    }
}

/**
 * Fungsi untuk menampilkan notifikasi dzikir
 */
function showDzikirNotification() {
    const { namaUser } = notificationPayload;
    const title = 'Pengingat Dzikir';
    const namaPengguna = namaUser ? `${namaUser}, ` : '';
    const body = `${namaPengguna}ingatlah kepada Alloh`;

    const options = {
        body,
        icon: 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        data: { url: notificationPayload.url || '/' },
        vibrate: [200, 100, 200]
    };

    self.registration.showNotification(title, options)
        .then(() => log('showDzikirNotification succeeded:', title))
        .catch(e => err('showDzikirNotification failed:', e));
}
