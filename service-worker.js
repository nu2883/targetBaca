// service-worker.js

let dzikirInterval;
let notifInterval;

// Event saat Service Worker diinstal
self.addEventListener('install', event => {
    console.log('Service Worker: Installed');
    self.skipWaiting();
});

// Event saat Service Worker diaktifkan
self.addEventListener('activate', event => {
    console.log('Service Worker: Activated');
    event.waitUntil(self.clients.claim());
});

// Event saat halaman utama mengirim pesan ke Service Worker
self.addEventListener('message', event => {
    const { action, ...payload } = event.data;
    
    switch (action) {
        case 'startNotifications':
            startNotifications(payload);
            break;
        case 'stopNotifications':
            stopNotifications();
            break;
        case 'startDzikir':
            startDzikir(payload);
            break;
        case 'stopDzikir':
            stopDzikir();
            break;
        default:
            console.log(`Pesan tak dikenal: ${action}`);
    }
});

// Event saat notifikasi diklik oleh pengguna
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                const urlToOpen = event.notification.data?.url || '/';
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Fungsi untuk memulai pengingat bacaan
function startNotifications(payload) {
    stopNotifications(); // Hentikan notifikasi lama jika ada
    const checkAndNotify = () => {
        const progress = payload.halamanCapaian - payload.halamanSaatIni;
        const isTargetTercapai = progress >= payload.targetHarian;
        if (!isTargetTercapai) {
            showReadingNotification(payload);
        }
    };
    checkAndNotify(); // Langsung tampilkan notifikasi pertama
    notifInterval = setInterval(checkAndNotify, 1000 * 60 * 60); // Notifikasi setiap 1 jam
}

// Fungsi untuk menghentikan pengingat bacaan
function stopNotifications() {
    if (notifInterval) {
        clearInterval(notifInterval);
        notifInterval = null;
    }
}

// Fungsi untuk menampilkan notifikasi bacaan
function showReadingNotification(payload) {
    const { namaUser, kekuranganTarget } = payload;
    const title = "Pengingat Bacaan Al-Qur'an";
    const namaPengguna = namaUser ? `${namaUser}, ` : '';
    const body = `${namaPengguna}Anda masih perlu membaca ${kekuranganTarget} halaman lagi untuk mencapai target harian.`;
    self.registration.showNotification(title, {
        body,
        icon: 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        tag: 'reading-reminder',
        renotify: true,
        data: { url: '/' }
    });
}

// Fungsi untuk memulai pengingat dzikir
function startDzikir(payload) {
    stopDzikir(); // Hentikan notifikasi dzikir lama jika ada
    const ms = Math.max(1, payload.dzikirMenit || 5) * 60 * 1000;
    showDzikirNotification(payload.namaUser); // Langsung tampilkan notifikasi pertama
    dzikirInterval = setInterval(() => {
        showDzikirNotification(payload.namaUser);
    }, ms);
}

// Fungsi untuk menghentikan pengingat dzikir
function stopDzikir() {
    if (dzikirInterval) {
        clearInterval(dzikirInterval);
        dzikirInterval = null;
    }
}

// Fungsi untuk menampilkan notifikasi dzikir
function showDzikirNotification(namaUser) {
    const title = 'Pengingat Dzikir';
    const namaPengguna = namaUser ? `${namaUser}, ` : '';
    const body = `${namaPengguna}ingatlah kepada Alloh`;
    self.registration.showNotification(title, {
        body,
        icon: 'https://placehold.co/192x192/000000/FFFFFF?text=Q',
        badge: 'https://placehold.co/72x72/000000/FFFFFF?text=Q',
        tag: 'dzikir-reminder',
        renotify: true,
        data: { url: '/' }
    });
}
