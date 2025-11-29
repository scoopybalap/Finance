// js/main.js
import { data, loadAppData, saveAppData } from './db.js';
import * as UI from './ui.js'; 
import { initMoneyInputs } from './utils.js';

// --- REGISTER SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered (Offline Mode)!', reg.scope))
            .catch(err => console.log('SW Failed', err));
    });
}

// --- EXPOSE TO WINDOW ---
window.navTo = UI.navTo;
window.switchTab = UI.switchTab;
window.openModal = UI.openModal;
window.closeModal = UI.closeModal;
window.saveBudget = UI.saveBudget;
window.editBudget = UI.editBudget;
window.deleteItem = UI.deleteItem;
window.toggleTheme = UI.toggleTheme;
window.renderBudget = UI.renderBudget;
window.onBudgetTypeChange = UI.onBudgetTypeChange;
window.installApp = UI.installApp;
window.dismissInstall = UI.dismissInstall;
window.logoutUser = () => { location.reload(); };

// --- MAIN INIT ---

window.addEventListener('load', () => {
    // 1. Matikan Loading Overlay segera
    const loadingOverlay = document.getElementById('loading-overlay');
    if(loadingOverlay) loadingOverlay.style.display = 'none';

    // 2. Sembunyikan Layar Login (Pastikan user langsung masuk)
    const loginScreen = document.getElementById('login-screen');
    if(loginScreen) loginScreen.style.display = 'none';

    // 3. Set User Dummy (Penting agar UI tidak error mencari uid)
    window.currentUser = {
        uid: 'offline-user-123',
        displayName: 'User Lokal',
        email: 'local@finpro.app'
    };

    // 4. Inisialisasi PWA Prompt
    UI.initPWA();

    // 5. Jalankan Aplikasi
    startApp();
});

async function startApp() {
    console.log("Memulai aplikasi dalam mode Offline/Lokal...");
    
    // Load data hanya dari LocalStorage
    await loadAppData();
    
    UI.initTheme();
    initMoneyInputs();
    
    // Render UI
    UI.updateUI();
    
    // Set tanggal hari ini di input modal
    const dateInput = document.getElementById('b-date');
    if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    // Refresh Ads jika ada
    setTimeout(() => {
        if (typeof window.refreshAds === 'function') window.refreshAds('page-home');
    }, 1000);
}

window.addEventListener('load', () => {
    // Init PWA Prompt Logic
    UI.initPWA();

    if(window.firebaseLib) {
        const { initializeApp, getAuth, getFirestore, onAuthStateChanged, enableIndexedDbPersistence } = window.firebaseLib;
        
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        window.dbInstance = db;
        
        // Offline Persistence
        enableIndexedDbPersistence(db).catch(err => console.log("Persistence error:", err.code));

        setupAuthListeners(auth);

        onAuthStateChanged(auth, (user) => {
            document.getElementById('loading-overlay').style.display = 'none';
            if (user) {
                window.currentUser = user;
                document.getElementById('login-screen').style.display = 'none';
                startApp();
            } else {
                document.getElementById('login-screen').style.display = 'flex';
            }
        });
    } else {
        alert("Firebase Lib Error. Cek koneksi.");
    }
});

async function startApp() {
    await loadAppData(window.currentUser, db);
    setupRealtimeListener(window.currentUser, db, () => UI.updateUI());
    
    UI.initTheme();
    initMoneyInputs();
    UI.updateUI();
    
    // Set tanggal hari ini di input modal
    const dateInput = document.getElementById('b-date');
    if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}
