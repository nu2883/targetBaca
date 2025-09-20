// service-worker.js - Kode yang telah dioptimalkan

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
// Gunakan TimeoutId untuk penjadwalan yang lebih andal
let dzikirTimeoutId = null;

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
 * Diharapkan payload minimal: { action, ...data }
 */
self.addEventListener('message', (event) => {
    try {
        const data = event.data || {};
        log('message received:', data);

        const action = data.action || '';
        
        // Perbarui payload dengan data terbaru dari halaman
        notificationPayload = { ...data };

        if (action === 'startNotifications') {
            // Logika untuk notifikasi harian akan ada di sini
            log('Menerima perintah startNotifications, akan dijalankan saat idle.');
        } else if (action === 'stopNotifications') {
            log('Menerima perintah stopNotifications.');
        } else if (action === 'updateData') {
            // Update data notifikasi tanpa menjalankan aksi
            log('Menerima perintah updateData.');
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
 * Fungsi untuk memulai pengingat dzikir
 */
function startDzikir() {
    // Hentikan notifikasi dzikir yang sedang berjalan jika ada
    stopDzikir();
    // Panggil fungsi penjadwal pertama kali
    scheduleDzikirNotification(true);
    log('Pengingat dzikir berhasil dijadwalkan.');
}

/**
 * Fungsi untuk menghentikan pengingat dzikir
 */
function stopDzikir() {
    if (dzikirTimeoutId) {
        clearTimeout(dzikirTimeoutId);
        dzikirTimeoutId = null;
        log('Pengingat dzikir dihentikan.');
    }
}

/**
 * Fungsi untuk menampilkan dan menjadwalkan ulang notifikasi dzikir
 */
async function scheduleDzikirNotification(isFirstRun = false) {
    const { namaUser, dzikirMenit } = notificationPayload;

    // Pastikan data yang diperlukan ada
    if (!dzikirMenit || dzikirMenit <= 0) {
        warn('Interval dzikir tidak valid, membatalkan penjadwalan.');
        return;
    }

    // Hanya tampilkan notifikasi jika ini bukan panggilan pertama
    if (!isFirstRun) {
        try {
            const title = 'Pengingat Dzikir';
            const namaPengguna = namaUser ? `${namaUser}, ` : '';
            const body = `${namaPengguna}ayo berdzikir.`;

            const options = {
                body,
                icon: '/path/to/your/icon.png', // <-- GANTI DENGAN PATH ICON ANDA
                badge: '/path/to/your/badge.png', // <-- GANTI DENGAN PATH BADGE ANDA
                data: { url: notificationPayload.url || '/' },
                vibrate: [200, 100, 200],
                tag: 'dzikir-notification'
            };

            await self.registration.showNotification(title, options);
            log(`Notifikasi dzikir berhasil ditampilkan.`);
        } catch (e) {
            err('Gagal menampilkan notifikasi dzikir:', e);
            // Jangan menjadwalkan ulang jika terjadi kegagalan
            return;
        }
    }

    // Hitung waktu penundaan dalam milidetik
    const ms = Math.max(1, dzikirMenit) * 60 * 1000;
    log(`Menjadwalkan notifikasi berikutnya dalam ${dzikirMenit} menit.`);

    // Atur timer untuk notifikasi berikutnya
    dzikirTimeoutId = setTimeout(() => {
        scheduleDzikirNotification();
    }, ms);
}
