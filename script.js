let transactions = [];
const form = document.getElementById('transactionForm');
const piutangListContainer = document.getElementById('piutangList');
const utangListContainer = document.getElementById('utangList');
const historyListContainer = document.getElementById('historyList'); 

const menuToggle = document.getElementById('menuToggle');
const sideMenuModal = document.getElementById('sideMenuModal');
const sideMenuContent = document.getElementById('sideMenuContent');
const menuItems = document.querySelectorAll('#sideMenuModal .menu-item');

const principalInput = document.getElementById('principal');
const interestRateInput = document.getElementById('interestRate');
const installmentsCountInput = document.getElementById('installmentsCount');
const startDateInput = document.getElementById('startDate'); 
const finalDueDateDisplay = document.getElementById('finalDueDateDisplay'); 
const estimateDiv = document.getElementById('installmentEstimate');

let piutangChartInstance = null; 

// ===================================
// 1. MANAJEMEN DATA & LOCAL STORAGE
// ===================================

function loadTransactions() {
    const storedTransactions = localStorage.getItem('personalFinanceTracker');
    if (storedTransactions) {
        try {
            transactions = JSON.parse(storedTransactions); 
        } catch (e) {
            console.error("Gagal memuat data dari Local Storage:", e);
            transactions = []; 
            // alert("Data dari Local Storage rusak. Aplikasi akan dimulai dengan data kosong."); // Di-comment agar tidak mengganggu
        }
    }
}

function saveTransactions() {
    localStorage.setItem('personalFinanceTracker', JSON.stringify(transactions));
}

// ===================================
// 2. FUNGSI UTILITAS (Sama seperti sebelumnya)
// ===================================

function formatInputRupiah(inputElement) {
    let angka = inputElement.value.replace(/\D/g, ''); 
    if (!angka || angka === '0') {
        inputElement.value = '';
        return;
    }
    let formatted = new Intl.NumberFormat('id-ID').format(angka);
    inputElement.value = formatted;
}

function formatCurrency(amount) {
    const roundedAmount = Math.round(parseFloat(amount)); 
    return roundedAmount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function cleanInterestRate(input) {
    return input.toString().replace(/,/g, '.').replace(/[^0-9.]/g, ''); 
}

function cleanPrincipal(input) {
     return input.toString().replace(/\./g, '').replace(/,/g, ''); 
}

function calculateTotal(principal, rate, installmentsCount) {
    const principalAmount = parseFloat(cleanPrincipal(principal)); 
    const interestRate = parseFloat(cleanInterestRate(rate)) / 100; 
    const installments = parseInt(installmentsCount);
    
    if (isNaN(principalAmount) || isNaN(interestRate) || isNaN(installments) || installments === 0) {
        return { totalInterest: 0, totalAmount: 0, totalPerInstallment: 0 };
    }
    
    // Angka yang lebih akurat untuk menghindari masalah floating point
    const totalInterest = parseFloat((principalAmount * interestRate * installments).toFixed(2));
    const totalAmount = principalAmount + totalInterest;
    const totalPerInstallment = parseFloat((totalAmount / installments).toFixed(2));
    
    return {
        totalInterest: totalInterest,
        totalAmount: totalAmount,
        totalPerInstallment: totalPerInstallment,
    };
}

function getFinancialTotals() {
    let totalPiutangAwal = 0; 
    let sisaPiutang = 0;      
    let totalUtangAwal = 0;   
    let sisaUtang = 0;        

    let piutangAktif = 0;
    let piutangLunas = 0;
    let utangAktif = 0;
    let utangLunas = 0;

    transactions.forEach(tx => { 
        const result = calculateTotal(tx.principal, tx.interestRate, tx.installmentsCount);
        const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
        const remainingInstallments = tx.installmentsCount - paidCount;
        const remainingTotal = result.totalPerInstallment * remainingInstallments;

        if (tx.type === 'piutang') {
            totalPiutangAwal += result.totalAmount;
            if (tx.status === 'aktif') {
                sisaPiutang += remainingTotal;
                piutangAktif += remainingTotal; 
            } else {
                piutangLunas += result.totalAmount; 
            }
        } else if (tx.type === 'utang') {
            totalUtangAwal += result.totalAmount;
            if (tx.status === 'aktif') {
                sisaUtang += remainingTotal;
                utangAktif += remainingTotal; 
            } else {
                utangLunas += result.totalAmount; 
            }
        }
    });
    
    const netWorthAwal = totalPiutangAwal - totalUtangAwal;
    const netWorthAkhir = sisaPiutang - sisaUtang;
    
    return {
        totalPiutangAwal, sisaPiutang, 
        totalUtangAwal, sisaUtang,
        netWorthAwal, netWorthAkhir,
        piutangAktif, piutangLunas, utangAktif, utangLunas 
    };
}

function updateInstallmentEstimate() {
    const principalFormatted = principalInput.value;
    const principalClean = cleanPrincipal(principalFormatted); 
    const rateClean = cleanInterestRate(interestRateInput.value); 
    const installments = parseInt(installmentsCountInput.value);

    if (!principalClean || principalClean <= 0 || !rateClean || installments < 1) {
        estimateDiv.style.display = 'none';
        return;
    }

    const result = calculateTotal(principalClean, rateClean, installments);

    if (result.totalPerInstallment > 0) {
        estimateDiv.style.display = 'block';
        estimateDiv.innerHTML = `
            <p style="margin: 0; font-size: 0.95em; color:var(--primary-dark);">
                Estimasi Cicilan per Bulan (${installments}x): 
                <strong style="font-size: 1.1em;">Rp ${formatCurrency(result.totalPerInstallment)}</strong>
                <span style="font-size: 0.8em; color: var(--text-muted);">(Total akhir: Rp ${formatCurrency(result.totalAmount)})</span>
            </p>
        `;
    } else {
         estimateDiv.style.display = 'none';
    }
}

function calculateDueDate() {
    const startDateValue = startDateInput.value;
    const installments = parseInt(installmentsCountInput.value);
    
    if (!startDateValue || installments < 1) {
        finalDueDateDisplay.textContent = 'Pilih tanggal mulai dan tenor/cicilan.';
        return '';
    }

    const startDate = new Date(startDateValue + 'T00:00:00'); // Penting untuk menghindari masalah zona waktu
    if (isNaN(startDate.getTime())) { 
        finalDueDateDisplay.textContent = 'Tanggal mulai tidak valid.';
        return '';
    }
    
    const startDay = startDate.getDate();
    const finalDueDate = new Date(startDate);
    
    finalDueDate.setMonth(finalDueDate.getMonth() + installments); 
    
    // Koreksi tanggal jika terjadi rollover (misalnya 31 Jan + 1 bulan = 3 Mar, dikoreksi ke 28 Feb)
    if (finalDueDate.getDate() !== startDay) {
        finalDueDate.setDate(0); 
    }

    const formattedDate = finalDueDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    
    finalDueDateDisplay.textContent = formattedDate;
    
    return finalDueDate.toISOString().split('T')[0];
}

function calculateNextDueDate(tx) {
     const dateString = tx.startDate || tx.date;
     
     if (tx.status !== 'aktif' || !dateString) return null;

     const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
     if (paidCount >= tx.installmentsCount) return null; 

     const startDate = new Date(dateString + 'T00:00:00'); 
     if (isNaN(startDate.getTime())) return null; 

     const startDay = startDate.getDate();
     const nextDueDate = new Date(startDate);
     
     // Hitung tanggal jatuh tempo cicilan berikutnya
     nextDueDate.setMonth(nextDueDate.getMonth() + paidCount + 1); 

     // Koreksi tanggal jika terjadi rollover
     if (nextDueDate.getDate() !== startDay) {
        nextDueDate.setDate(0); 
     }
     
     return nextDueDate.toISOString().split('T')[0]; 
}

function getDueStatus(dueDate) {
    if (!dueDate) return { badge: '', class: '' }; 

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); 
    
    if (isNaN(due.getTime())) return { badge: 'TANGGAL ERROR', class: 'status-late' }; 

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { badge: `TERLAMBAT ${Math.abs(diffDays)} hari`, class: 'status-late' };
    } else if (diffDays <= 7) {
        return { badge: `JATUH TEMPO ${diffDays} hari lagi`, class: 'status-active' };
    } else {
        return { badge: 'AKTIF', class: 'status-active' };
    }
}

// ===================================
// 3. FUNGSI RENDER (Diperbarui dengan ikon modern)
// ===================================

function renderSummaryCards() {
    const totals = getFinancialTotals();
    const mainDashboard = document.getElementById('mainDashboard');
    mainDashboard.innerHTML = `
        <div class="summary-card card-piutang">
            <h3>Sisa Piutang Aktif</h3>
            <p>Rp ${formatCurrency(totals.sisaPiutang)}</p>
        </div>
        <div class="summary-card card-utang">
            <h3>Sisa Utang Aktif</h3>
            <p>Rp ${formatCurrency(totals.sisaUtang)}</p>
        </div>
        <div class="summary-card card-networth">
            <h3>Net Worth (Bersih)</h3>
            <p style="color: ${totals.netWorthAkhir >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">Rp ${formatCurrency(totals.netWorthAkhir)}</p>
        </div>
    `;

    // Update Summary Page
    document.getElementById('summaryPiutangAwal').textContent = `Rp ${formatCurrency(totals.totalPiutangAwal)}`;
    document.getElementById('summaryPiutangSisa').textContent = `Rp ${formatCurrency(totals.sisaPiutang)}`;
    document.getElementById('summaryUtangAwal').textContent = `Rp ${formatCurrency(totals.totalUtangAwal)}`;
    document.getElementById('summaryUtangSisa').textContent = `Rp ${formatCurrency(totals.sisaUtang)}`;
    document.getElementById('summaryNetWorth').textContent = `Rp ${formatCurrency(totals.netWorthAkhir)}`;
    document.getElementById('summaryNetWorth').style.color = totals.netWorthAkhir >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
}

function renderTransactionList(type, containerId) {
    const container = document.getElementById(containerId);
    let listHtml = '';
    
    let filteredList;
    if (type === 'history') {
         filteredList = transactions.filter(tx => tx.status === 'lunas');
    } else {
         filteredList = transactions.filter(tx => tx.type === type && tx.status === 'aktif');
    }
    
    const searchQuery = document.getElementById(`search${type.charAt(0).toUpperCase() + type.slice(1)}`)?.value.toLowerCase() || '';
    if (searchQuery) {
        filteredList = filteredList.filter(tx => tx.person.toLowerCase().includes(searchQuery));
    }
    
    // Sorting
    const sortValue = document.getElementById(`sort${type.charAt(0).toUpperCase() + type.slice(1)}`)?.value;
    if (sortValue) {
        filteredList.sort((a, b) => sortTransactions(a, b, sortValue));
    } else if (type === 'history') {
        filteredList.sort((a, b) => new Date(b.dateCompleted) - new Date(a.dateCompleted)); 
    } else {
         filteredList.sort((a, b) => { 
            const nextDueA = calculateNextDueDate(a) || '9999-12-31';
            const nextDueB = calculateNextDueDate(b) || '9999-12-31';
            return nextDueA.localeCompare(nextDueB);
        });
    }


    if (filteredList.length === 0) {
         container.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Tidak ada ${type} ${type === 'history' ? 'yang lunas' : 'aktif'} yang tercatat.</p>`;
         return;
    }

    filteredList.forEach(tx => {
        const nextDueDate = calculateNextDueDate(tx);
        const dueStatus = getDueStatus(nextDueDate);
        const totals = calculateTotal(tx.principal, tx.interestRate, tx.installmentsCount);
        const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
        const remainingInstallments = tx.installmentsCount - paidCount;
        const remainingTotal = totals.totalPerInstallment * remainingInstallments;
        
        let amountDisplay;
        let dueInfo;
        let badge;

        if (tx.status === 'aktif') {
            amountDisplay = `<div class="remaining-amount">Rp ${formatCurrency(remainingTotal)}</div>`;
            dueInfo = `<div class="due-info">Cicilan ke ${paidCount + 1} (${tx.installmentsCount}x)</div>
                       <div class="due-info">Jatuh Tempo: ${nextDueDate ? new Date(nextDueDate + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</div>`;
            badge = `<span class="status-badge ${dueStatus.class}">${dueStatus.badge}</span>`;
        } else { // Lunas
            amountDisplay = `<div class="remaining-amount" style="color:var(--success-color);">LUNAS</div>`;
            dueInfo = `<div class="due-info">Pokok: Rp ${formatCurrency(tx.principal)}</div>
                       <div class="due-info">Lunas: ${tx.dateCompleted ? new Date(tx.dateCompleted + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</div>`;
            badge = `<span class="status-badge" style="background-color: #d4edda; color: var(--success-color);">SELESAI</span>`;
        }
        
        const initials = tx.person.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        listHtml += `
            <div class="transaction-list-item ${tx.type}" data-id="${tx.id}" onclick="showDetailModal('${tx.id}')">
                <div class="avatar-icon">${initials}</div>
                <div class="info-section">
                    <strong>${tx.person}</strong>
                    <p style="margin: 3px 0 0;">${tx.type === 'piutang' ? 'MEMBERI PINJAMAN' : 'MENERIMA PINJAMAN'}</p>
                    ${badge}
                </div>
                <div class="amount-section">
                    ${amountDisplay}
                    ${dueInfo}
                </div>
            </div>
        `;
    });

    container.innerHTML = listHtml;
}

function renderLatestTransactions() {
    const latestContainer = document.getElementById('latestTransactions');
    let activeList = transactions.filter(tx => tx.status === 'aktif');
    
    // Sort by next due date (ascending)
    activeList.sort((a, b) => {
         const nextDueA = calculateNextDueDate(a) || '9999-12-31';
         const nextDueB = calculateNextDueDate(b) || '9999-12-31';
         return nextDueA.localeCompare(nextDueB);
    });
    
    const limitedList = activeList.slice(0, 5); // Ambil 5 transaksi terbaru

    if (limitedList.length === 0) {
         latestContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Tidak ada transaksi aktif.</p>`;
         return;
    }
    
    let listHtml = '';
    limitedList.forEach(tx => {
        const nextDueDate = calculateNextDueDate(tx);
        const dueStatus = getDueStatus(nextDueDate);
        const totals = calculateTotal(tx.principal, tx.interestRate, tx.installmentsCount);
        const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
        const remainingInstallments = tx.installmentsCount - paidCount;
        const remainingTotal = totals.totalPerInstallment * remainingInstallments;
        
        const initials = tx.person.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        listHtml += `
            <div class="transaction-list-item ${tx.type}" data-id="${tx.id}" onclick="showDetailModal('${tx.id}')">
                <div class="avatar-icon">${initials}</div>
                <div class="info-section">
                    <strong>${tx.person}</strong>
                    <p style="margin: 3px 0 0; font-size: 0.9em;">
                       ${tx.type === 'piutang' ? 'Piutang' : 'Utang'} | Cicilan ${paidCount + 1} dari ${tx.installmentsCount}
                    </p>
                    <span class="status-badge ${dueStatus.class}" style="margin-top: 5px;">${dueStatus.badge}</span>
                </div>
                <div class="amount-section">
                    <div class="remaining-amount" style="color: ${tx.type === 'piutang' ? 'var(--success-color)' : 'var(--danger-color)'};">Rp ${formatCurrency(remainingTotal)}</div>
                    <div class="due-info">Jatuh Tempo: ${nextDueDate ? new Date(nextDueDate + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</div>
                </div>
            </div>
        `;
    });
    latestContainer.innerHTML = listHtml;
}

function renderChart() {
    const totals = getFinancialTotals();
    const ctx = document.getElementById('piutangChart')?.getContext('2d');
    
    if (!ctx) return; 

    if (piutangChartInstance) {
        piutangChartInstance.destroy();
    }
    
    const pluginsArray = [ChartDataLabels];
    if (typeof ChartDataLabels === 'undefined' || !ChartDataLabels.id) {
        pluginsArray.pop();
    }


    const chartData = {
        labels: ['Piutang Aktif', 'Utang Aktif', 'Piutang Lunas', 'Utang Lunas'],
        datasets: [{
            data: [totals.piutangAktif, totals.utangAktif, totals.piutangLunas, totals.utangLunas],
            backgroundColor: [
                '#4CAF50', // Piutang Aktif (Hijau Primer)
                '#F44336', // Utang Aktif (Merah Danger)
                '#81C784', // Piutang Lunas (Hijau Lebih Muda)
                '#EF9A9A'  // Utang Lunas (Merah Lebih Muda)
            ],
            hoverOffset: 10
        }]
    };

    piutangChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += 'Rp ' + formatCurrency(context.parsed);
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    formatter: (value, context) => {
                        if (value === 0) return '';
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        if (total === 0 || (value / total) < 0.05) return ''; 
                        return 'Rp ' + formatCurrency(value);
                    },
                    color: '#fff',
                    font: { weight: 'bold', size: 10 }
                }
            }
        },
        plugins: pluginsArray 
    });
}

// ===================================
// 4. FUNGSI NAVIGASI & INTERAKSI (Sama seperti sebelumnya)
// ===================================

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if(targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('#sideMenuContent .menu-item').forEach(item => {
         item.classList.remove('active');
         if (item.getAttribute('data-page') === pageId) {
             item.classList.add('active');
         }
    });

    const fab = document.getElementById('fabAddTransaction');
    if (pageId === 'homePage') {
        fab.classList.add('show');
    } else {
        fab.classList.remove('show');
    }

    if (pageId === 'homePage') {
        renderSummaryCards();
        renderLatestTransactions();
        renderChart();
    } else if (pageId === 'piutangPage') {
         renderTransactionList('piutang', 'piutangList');
    } else if (pageId === 'utangPage') {
         renderTransactionList('utang', 'utangList');
    } else if (pageId === 'historyPage') {
         renderTransactionList('history', 'historyList');
    } else if (pageId === 'summaryPage') {
        renderSummaryCards(); 
    }
    
    closeSideMenu();
    
    if(pageId !== 'homePage') {
        history.pushState({page: pageId}, pageId, `#${pageId}`);
    } else {
        history.pushState({page: 'homePage'}, 'homePage', '#homePage');
    }
}

function sortTransactions(a, b, sortValue) {
    if (sortValue === 'due_asc') {
        const nextDueA = calculateNextDueDate(a) || '9999-12-31';
        const nextDueB = calculateNextDueDate(b) || '9999-12-31';
        return nextDueA.localeCompare(nextDueB);
    } else if (sortValue === 'due_desc') {
        const nextDueA = calculateNextDueDate(a) || '0000-01-01';
        const nextDueB = calculateNextDueDate(b) || '0000-01-01';
        return nextDueB.localeCompare(nextDueA);
    } else if (sortValue === 'amount_desc') {
        const totalsA = calculateTotal(a.principal, a.interestRate, a.installmentsCount);
        const remainingA = totalsA.totalPerInstallment * (a.installmentsCount - (a.paymentHistory ? a.paymentHistory.length : 0));
        const totalsB = calculateTotal(b.principal, b.interestRate, b.installmentsCount);
        const remainingB = totalsB.totalPerInstallment * (b.installmentsCount - (b.paymentHistory ? b.paymentHistory.length : 0));
        return remainingB - remainingA;
    } else if (sortValue === 'lunas_desc') {
        const dateA = a.dateCompleted || '0000-01-01';
        const dateB = b.dateCompleted || '0000-01-01';
        return dateB.localeCompare(dateA);
    } else if (sortValue === 'principal_desc') {
        return cleanPrincipal(b.principal) - cleanPrincipal(a.principal);
    }
}

function filterTransactionList(type) {
     renderTransactionList(type, `${type}List`);
}

function openSideMenu() {
    sideMenuModal.style.display = 'block';
    setTimeout(() => {
        sideMenuContent.style.transform = 'translateX(0)';
    }, 10);
}

function closeSideMenu() {
    sideMenuContent.style.transform = 'translateX(-100%)';
    setTimeout(() => {
        sideMenuModal.style.display = 'none';
    }, 300);
}

// ===================================
// 5. FUNGSI FORM & MODAL (Sama seperti sebelumnya)
// ===================================

form.addEventListener('submit', function(e) {
    e.preventDefault();

    const principalClean = cleanPrincipal(principalInput.value);
    const rateClean = cleanInterestRate(interestRateInput.value); 
    const installments = parseInt(installmentsCountInput.value);
    const finalDueDate = calculateDueDate();

    if (principalClean <= 0 || rateClean < 0 || installments <= 0) {
        alert('Jumlah Pokok, Suku Bunga (>=0), dan Cicilan (>0) harus diisi dengan benar.');
        return;
    }

    const newTransaction = {
        id: Date.now().toString(),
        type: document.getElementById('type').value,
        person: document.getElementById('person').value,
        principal: principalClean,
        startDate: document.getElementById('startDate').value,
        interestRate: rateClean,
        installmentsCount: installments,
        status: 'aktif',
        dateCompleted: null,
        paymentHistory: []
    };

    transactions.unshift(newTransaction);
    saveTransactions();
    
    alert('Transaksi berhasil dicatat!'); 
    form.reset();
    finalDueDateDisplay.textContent = 'Pilih tanggal mulai dan tenor/cicilan.';
    estimateDiv.style.display = 'none';
    
    reRenderAllLists(); 
    navigateTo('homePage'); 
});

function showDetailModal(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const modal = document.getElementById('transactionDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');
    
    const totals = calculateTotal(tx.principal, tx.interestRate, tx.installmentsCount);
    const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
    const remainingInstallments = tx.installmentsCount - paidCount;
    const remainingTotal = totals.totalPerInstallment * remainingInstallments;
    const nextDueDate = calculateNextDueDate(tx);

    modalTitle.textContent = `${tx.type === 'piutang' ? 'Piutang' : 'Utang'} dengan ${tx.person}`;
    
    let historyHtml = tx.paymentHistory && tx.paymentHistory.length > 0
        ? tx.paymentHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)) 
            .map((p, index) => {
            // Urutkan riwayat asli berdasarkan tanggal untuk mengetahui nomor cicilan
            const originalSortedHistory = tx.paymentHistory.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
            const paymentIndexInTimeOrder = originalSortedHistory.findIndex(item => item.date === p.date && item.amount === p.amount) + 1;
            
            const isLatest = index === 0; 
            const deleteButton = isLatest && tx.status === 'aktif'
                ? `<span style="color: var(--danger-color); cursor: pointer; font-size: 0.9em; margin-left: 10px;" onclick="cancelLastPayment('${tx.id}')"> [Batalkan]</span>`
                : '';

            return `
                <div>
                    <span>Cicilan ke-${paymentIndexInTimeOrder} (${new Date(p.date + 'T00:00:00').toLocaleDateString('id-ID')})</span>
                    <strong>Rp ${formatCurrency(p.amount)}${deleteButton}</strong>
                </div>
            `;
          }).join('')
        : '<p style="text-align: center; font-size: 0.9em; color: var(--text-muted);">Belum ada riwayat pembayaran.</p>';

    modalContent.innerHTML = `
        <div class="modal-detail-row"><span>Status:</span> <strong>${tx.status.toUpperCase()}</strong></div>
        <div class="modal-detail-row"><span>Pokok Pinjaman:</span> <strong>Rp ${formatCurrency(tx.principal)}</strong></div>
        <div class="modal-detail-row"><span>Total dengan Bunga (${tx.interestRate}%):</span> <strong>Rp ${formatCurrency(totals.totalAmount)}</strong></div>
        <div class="modal-detail-row"><span>Tenor/Cicilan:</span> <strong>${tx.installmentsCount} Bulan</strong></div>
        <div class="modal-detail-row"><span>Cicilan per Bulan:</span> <strong>Rp ${formatCurrency(totals.totalPerInstallment)}</strong></div>
        <hr style="margin: 10px 0;">
        <div class="modal-detail-row final-summary" style="color: ${tx.type === 'piutang' ? 'var(--success-color)' : 'var(--danger-color)'};">
            <span>Sisa Total:</span> <strong>Rp ${formatCurrency(remainingTotal)}</strong>
        </div>
        ${tx.status === 'aktif' ? `
            <div class="modal-detail-row"><span>Sisa Cicilan:</span> <strong>${remainingInstallments} dari ${tx.installmentsCount}</strong></div>
            <div class="modal-detail-row"><span>Jatuh Tempo Cicilan Berikut:</span> <strong>${nextDueDate ? new Date(nextDueDate + 'T00:00:00').toLocaleDateString('id-ID') : '-'}</strong></div>
        ` : ''}
        
        <h3>Riwayat Pembayaran (${paidCount}x)</h3>
        <div class="payment-history-list">${historyHtml}</div>
    `;

    modalActions.innerHTML = '';
    if (tx.status === 'aktif') {
        if (remainingInstallments > 0) {
             modalActions.innerHTML += `<button style="background-color: var(--success-color);" onclick="recordPaymentWithDate('${tx.id}', ${totals.totalPerInstallment})">Catat Pembayaran Cicilan (Rp ${formatCurrency(totals.totalPerInstallment)})</button>`;
        }
        modalActions.innerHTML += `<button style="background-color: var(--danger-color);" onclick="deleteTransaction('${tx.id}')">Hapus Transaksi</button>`;
    } else {
         modalActions.innerHTML += `<p style="text-align: center; color: var(--success-color); font-weight: bold;">Transaksi ini sudah LUNAS.</p>`;
         modalActions.innerHTML += `<button style="background-color: var(--danger-color);" onclick="deleteTransaction('${tx.id}')">Hapus Transaksi (Riwayat)</button>`;
    }
    
    modal.style.display = 'block';
}

function closeDetailModal() {
    document.getElementById('transactionDetailModal').style.display = 'none';
}

function recordPaymentWithDate(id, installmentAmount) {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = prompt(`Masukkan tanggal pembayaran untuk cicilan sebesar Rp ${formatCurrency(installmentAmount)} (YYYY-MM-DD):`, today);

    if (dateInput === null || dateInput.trim() === '') {
        return; 
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        alert('Format tanggal tidak valid. Gunakan format YYYY-MM-DD (contoh: 2025-11-12).');
        return;
    }

    recordPayment(id, installmentAmount, dateInput);
}

function recordPayment(id, installmentAmount, datePaid) {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.status !== 'aktif') return;

    tx.paymentHistory.push({
        date: datePaid,
        amount: installmentAmount
    });
    
    // Urutkan riwayat pembayaran berdasarkan tanggal secara ascending
    tx.paymentHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (tx.paymentHistory.length >= tx.installmentsCount) {
        tx.status = 'lunas';
        tx.dateCompleted = datePaid; 
    }

    saveTransactions();
    alert(`Pembayaran cicilan ke-${tx.paymentHistory.length} tanggal ${new Date(datePaid + 'T00:00:00').toLocaleDateString('id-ID')} berhasil dicatat!`);
    closeDetailModal();
    reRenderAllLists();
}

function cancelLastPayment(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx || tx.status !== 'aktif' || !tx.paymentHistory || tx.paymentHistory.length === 0) {
        alert('Tidak ada pembayaran aktif yang dapat dibatalkan.');
        return;
    }
    
    // Sortir berdasarkan tanggal pembayaran secara descending untuk mendapatkan yang terbaru
    const sortedHistory = tx.paymentHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastPayment = sortedHistory[0];

    if (!confirm(`Konfirmasi pembatalan/penghapusan cicilan terakhir (Tgl: ${new Date(lastPayment.date + 'T00:00:00').toLocaleDateString('id-ID')})?`)) return;

    // Cari index pembayaran yang sama dengan lastPayment di array asli (tx.paymentHistory)
    const indexToRemove = tx.paymentHistory.findIndex(p => p.date === lastPayment.date && p.amount === lastPayment.amount);
    
    if (indexToRemove !== -1) {
        tx.paymentHistory.splice(indexToRemove, 1); 
    } else {
         tx.paymentHistory.pop();
    }
    
    if (tx.status === 'lunas') {
        tx.status = 'aktif';
        tx.dateCompleted = null;
    }
    
    saveTransactions();
    alert('Pembayaran cicilan terakhir berhasil dibatalkan. Silakan input ulang jika terjadi kesalahan.');
    
    closeDetailModal();
    reRenderAllLists(); 
    setTimeout(() => showDetailModal(id), 300); 
}

function deleteTransaction(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan.')) return;

    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    alert('Transaksi berhasil dihapus.');
    closeDetailModal();
    reRenderAllLists();
}

// ===================================
// 6. FUNGSI IMPORT/EXPORT DATA (Sama seperti sebelumnya)
// ===================================

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    }
    return false;
}

function exportToCSV() {
    if (transactions.length === 0) {
        alert('Tidak ada data untuk diexport.');
        return;
    }

    let csv = 'ID,Tipe,Orang,Pokok (Rp),Tgl Mulai,Bunga (%),Tenor (Bulan),Total Akhir (Rp),Sisa (Rp),Status,Tgl Lunas,Riwayat Pembayaran\n';

    transactions.forEach(tx => {
        const totals = calculateTotal(tx.principal, tx.interestRate, tx.installmentsCount);
        const paidCount = tx.paymentHistory ? tx.paymentHistory.length : 0;
        const remainingInstallments = tx.installmentsCount - paidCount;
        const remainingTotal = totals.totalPerInstallment * remainingInstallments;
        
        const paymentDetails = tx.paymentHistory 
            ? tx.paymentHistory.map((p, i) => `Cicilan ${i+1}: Rp${Math.round(p.amount)} (${p.date})`).join(';')
            : '';

        const row = [
            tx.id,
            tx.type,
            `"${tx.person.replace(/"/g, '""')}"`, 
            cleanPrincipal(tx.principal), 
            tx.startDate,
            cleanInterestRate(tx.interestRate), 
            tx.installmentsCount,
            Math.round(totals.totalAmount),
            Math.round(remainingTotal),
            tx.status,
            tx.dateCompleted || '',
            `"${paymentDetails.replace(/"/g, '""')}"`
        ].join(',');
        
        csv += row + '\n';
    });

    const filename = "catatan_hutang_piutang_export_" + new Date().toISOString().split('T')[0] + ".csv";
    if (downloadFile(csv, filename, 'text/csv;charset=utf-8;')) {
        alert('Data berhasil diexport ke CSV!');
    } else {
        alert('Gagal mendownload file CSV.');
    }
}

function exportToJSON() {
    if (transactions.length === 0) {
        alert('Tidak ada data untuk diexport.');
        return;
    }
    
    const jsonContent = JSON.stringify(transactions, null, 2); 
    const filename = "catatan_hutang_piutang_backup_" + new Date().toISOString().split('T')[0] + ".json";
    
    if (downloadFile(jsonContent, filename, 'application/json;charset=utf-8;')) {
        alert('Data berhasil di-backup ke JSON!');
    } else {
        alert('Gagal mendownload file JSON.');
    }
}

function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('PERINGATAN: Mengimport data akan MENIMPA data yang ada di aplikasi saat ini. Lanjutkan?')) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedData) || (importedData.length > 0 && !importedData[0].id)) {
                alert('Format file JSON tidak valid. Pastikan ini adalah file backup yang benar.');
                event.target.value = '';
                return;
            }
            
            transactions = importedData;
            saveTransactions();
            alert('Import data berhasil! Aplikasi dimuat ulang dengan data baru.');
            reRenderAllLists();
            navigateTo('homePage');
            
        } catch (error) {
            console.error("Error saat parsing/import:", error);
            alert('Terjadi kesalahan saat memproses file. Pastikan file JSON tidak rusak.');
        }
         event.target.value = ''; 
    };
    
    reader.onerror = function() {
        alert('Gagal membaca file.');
         event.target.value = '';
    };

    reader.readAsText(file);
}

// ===================================
// 7. FUNGSI UTAMA & INITIALIZATION
// ===================================

function reRenderAllLists() {
    renderSummaryCards();
    renderChart();
    renderLatestTransactions();
    
    const activePageId = document.querySelector('.page.active')?.id; 
    
    if (activePageId === 'piutangPage') renderTransactionList('piutang', 'piutangList');
    if (activePageId === 'utangPage') renderTransactionList('utang', 'utangList');
    if (activePageId === 'historyPage') renderTransactionList('history', 'historyList');
    if (activePageId === 'homePage') {
        renderSummaryCards();
        renderLatestTransactions();
        renderChart();
    }
    if (activePageId === 'summaryPage') renderSummaryCards();
    
    if (activePageId === 'formPage') {
         document.getElementById('transactionForm').reset();
         document.getElementById('finalDueDateDisplay').textContent = 'Pilih tanggal mulai dan tenor/cicilan.';
         document.getElementById('installmentEstimate').style.display = 'none';
    }
}

function handleBackButton() {
    const activePageId = document.querySelector('.page.active')?.id; 
    
    if (activePageId && activePageId !== 'homePage') {
        navigateTo('homePage');
    } else {
        if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
            if (typeof navigator.app !== 'undefined') {
                navigator.app.exitApp(); 
            } else {
                history.back(); 
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    
    const fab = document.getElementById('fabAddTransaction');
    
    menuToggle.addEventListener('click', openSideMenu);
    sideMenuModal.addEventListener('click', (e) => {
        if (e.target.id === 'sideMenuModal') {
            closeSideMenu();
        }
    });
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
    
    window.addEventListener('popstate', function(event) {
         closeDetailModal();
         closeSideMenu(); 
         
         const statePage = event.state?.page;
         const hashPage = window.location.hash.replace('#', '');
         const targetPage = statePage || hashPage || 'homePage';
         
         if (document.getElementById(targetPage)) {
             document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
             document.getElementById(targetPage).classList.add('active');
             
             if (targetPage === 'homePage') {
                 fab.classList.add('show');
             } else {
                 fab.classList.remove('show');
             }
             
             reRenderAllLists(); 
         } else {
             handleBackButton();
         }
    });

    if (typeof document.addEventListener === 'function' && typeof navigator.app === 'undefined') { 
         document.addEventListener('backbutton', handleBackButton, false);
    }

    const initialPage = window.location.hash.replace('#', '') || 'homePage';
    navigateTo(initialPage);
    
    updateInstallmentEstimate(); 
    calculateDueDate(); 
    
    fab.classList.add('show');
});
