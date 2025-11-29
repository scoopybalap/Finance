// js/db.js
import { APP_KEY } from './config.js';

// State Data Utama
export let data = {
    budget: [], 
    loans: [], 
    goals: [], 
    bills: [],
    wallets: [
        { id: 1, name: 'Tunai', type: 'cash', balance: 0 },
        { id: 2, name: 'Bank/ATM', type: 'bank', balance: 0 },
        { id: 3, name: 'E-Wallet', type: 'ewallet', balance: 0 }
    ],
    // Daftar Kategori Default
    categories: [
        { id: 'c1', type: 'expense', name: 'Makan', icon: 'fa-utensils', color: '#ff6b6b' },
        { id: 'c2', type: 'expense', name: 'Transport', icon: 'fa-bus', color: '#54a0ff' },
        { id: 'c3', type: 'expense', name: 'Belanja', icon: 'fa-shopping-bag', color: '#1dd1a1' },
        { id: 'c4', type: 'expense', name: 'Tagihan', icon: 'fa-file-invoice', color: '#feca57' },
        { id: 'c5', type: 'expense', name: 'Hiburan', icon: 'fa-gamepad', color: '#5f27cd' },
        { id: 'c6', type: 'expense', name: 'Kesehatan', icon: 'fa-medkit', color: '#ff9ff3' },
        { id: 'c7', type: 'expense', name: 'Lainnya', icon: 'fa-box', color: '#8395a7' },
        { id: 'c8', type: 'income', name: 'Gaji', icon: 'fa-money-bill-wave', color: '#1dd1a1' },
        { id: 'c9', type: 'income', name: 'Bonus', icon: 'fa-star', color: '#feca57' },
        { id: 'c10', type: 'income', name: 'Investasi', icon: 'fa-chart-line', color: '#54a0ff' },
        { id: 'c11', type: 'income', name: 'Lainnya', icon: 'fa-box-open', color: '#8395a7' }
    ],
    emergency: { saved: 0, expense: 0, job: 'stable', dependents: '0', targetMonths: 6, targetAmount: 0 },
    settings: { theme: 'light', lang: 'id', pin: null }
};

export function setData(newData) {
    data = newData;
}

// [MODIFIED] Load Data (Hanya LocalStorage)
export async function loadAppData() {
    console.log("Mode Offline: Memuat data dari LocalStorage...");
    
    try {
        const localData = localStorage.getItem(APP_KEY);
        if (localData) {
            const parsedData = JSON.parse(localData);
            // Merge data agar jika ada properti baru (seperti categories) tidak error
            data = { ...data, ...parsedData };
            
            // Validasi Kategori jika user lama
            if(!data.categories || data.categories.length === 0) {
                 // Reset categories ke default jika hilang
                 data.categories = [
                    { id: 'c1', type: 'expense', name: 'Makan', icon: 'fa-utensils', color: '#ff6b6b' },
                    { id: 'c2', type: 'expense', name: 'Transport', icon: 'fa-bus', color: '#54a0ff' },
                    { id: 'c3', type: 'expense', name: 'Belanja', icon: 'fa-shopping-bag', color: '#1dd1a1' },
                    { id: 'c4', type: 'expense', name: 'Tagihan', icon: 'fa-file-invoice', color: '#feca57' },
                    { id: 'c5', type: 'expense', name: 'Hiburan', icon: 'fa-gamepad', color: '#5f27cd' },
                    { id: 'c6', type: 'expense', name: 'Kesehatan', icon: 'fa-medkit', color: '#ff9ff3' },
                    { id: 'c7', type: 'expense', name: 'Lainnya', icon: 'fa-box', color: '#8395a7' },
                    { id: 'c8', type: 'income', name: 'Gaji', icon: 'fa-money-bill-wave', color: '#1dd1a1' },
                    { id: 'c9', type: 'income', name: 'Bonus', icon: 'fa-star', color: '#feca57' },
                    { id: 'c10', type: 'income', name: 'Investasi', icon: 'fa-chart-line', color: '#54a0ff' },
                    { id: 'c11', type: 'income', name: 'Lainnya', icon: 'fa-box-open', color: '#8395a7' }
                ];
            }
        }
    } catch (error) {
        console.warn("Gagal memuat LocalStorage, menggunakan data default.");
    }
    
    // Validasi Struktur Data Wajib
    if (!data.bills) data.bills = [];
    if (!data.wallets || data.wallets.length === 0) {
         data.wallets = [{ id: 1, name: 'Tunai', type: 'cash', balance: 0 }];
    }
    if (!data.emergency) {
         data.emergency = { saved: 0, expense: 0, job: 'stable', dependents: '0', targetMonths: 6, targetAmount: 0 };
    }
}

// [MODIFIED] Save Data (Hanya LocalStorage)
export async function saveAppData() {
    localStorage.setItem(APP_KEY, JSON.stringify(data));
    console.log("Data saved to LocalStorage");
}

// [MODIFIED] Realtime Listener (Dinonaktifkan)
export function setupRealtimeListener(currentUser, db, onUpdateCallback) {
    // Tidak melakukan apa-apa di mode offline
    return () => {};
}
