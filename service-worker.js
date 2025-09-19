let dzikirInterval;
let notifInterval;
let notificationPayload = {};

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
            notificationPayload = payload;
            startNotifications();
            break;
        case 'stopNotifications':
            stopNotifications();
            break;
        case 'updateData':
            notificationPayload = payload;
            // Jika notifikasi aktif, perbarui jadwal dengan data baru
            if (notifInterval) {
                startNotifications();
            }
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

// Fungsi untuk memulai pengingat bacaan (tergantung target)
function startNotifications() {
    stopNotifications(); 
    
    if (notificationPayload.kekuranganTarget <= 0) {
        console.log("Target sudah tercapai, notifikasi tidak dimulai.");
        return;
    }

    const { notificationTimes } = notificationPayload;

    if (!notificationTimes || notificationTimes.length === 0) {
        console.log("Tidak ada waktu notifikasi yang diatur. Notifikasi tidak dimulai.");
        return;
    }

    // Gunakan objek untuk menyimpan timeout agar bisa di-clear nanti
    notifInterval = {};

    notificationTimes.forEach(time => {
        const [hours, minutes] = time.split(':').map(Number);
        
        const scheduleNotification = () => {
            const now = new Date();
            const notificationDate = new Date();
            notificationDate.setHours(hours, minutes, 0, 0);

            // Jika waktu notifikasi sudah lewat hari ini, jadwalkan untuk besok
            if (notificationDate.getTime() < now.getTime()) {
                notificationDate.setDate(notificationDate.getDate() + 1);
            }

            const delay = notificationDate.getTime() - now.getTime();

            console.log(`Menjadwalkan notifikasi untuk ${time} dalam ${delay}ms`);
            
            notifInterval[time] = setTimeout(() => {
                if (notificationPayload.kekuranganTarget > 0) {
                    showReadingNotification(notificationPayload);
                } else {
                    stopNotifications();
                }
                // Jadwalkan notifikasi yang sama untuk hari berikutnya
                scheduleNotification();
            }, delay);
        };

        scheduleNotification();
    });
}

// Fungsi untuk menghentikan pengingat bacaan
function stopNotifications() {
    if (notifInterval) {
        for (const time in notifInterval) {
            clearTimeout(notifInterval[time]);
        }
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
    stopDzikir();
    const ms = Math.max(1, payload.dzikirMenit || 5) * 60 * 1000;
    showDzikirNotification(payload.namaUser);
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
