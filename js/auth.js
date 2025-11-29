// js/auth.js
import { showToast, showConfirmDialog } from './ui.js';

// Fungsi kosong karena mode offline
export function setupAuthListeners(auth) {
    console.log("Auth listeners disabled (Offline Mode)");
}

export function logoutUser(auth) {
    showConfirmDialog("Keluar dari aplikasi?", function() {
        // Karena tidak ada firebase, kita hanya reload halaman
        // Atau bisa reset data jika mau
        location.reload();
    });
}
