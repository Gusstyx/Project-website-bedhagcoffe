// main.js
async function initPrediksiPanel() {
    console.log('Initializing Prediksi Panel...');
    
    // Gunakan modul yang sudah diekspos
    await window.salesModule.loadSalesData();
    await window.historyModule.loadPredictionHistory();
    
    // Gunakan fungsi dari utils
    window.populateProductOptions('filterProduk');
    window.populateProductOptions('predictionProduct');
    window.populateProductOptions('filterRiwayatProduk');
    
    window.salesModule.renderSalesData();
    window.historyModule.renderHistoryData();
    window.historyModule.updateAccuracyStats();

    // Populate product options
    await populateProductOptions('filterProduk');
    await populateProductOptions('predictionProduct');
    await populateProductOptions('filterRiwayatProduk');

    // Render data
    renderSalesData();
    renderHistoryData();
    updateAccuracyStats();

    // Initialize tab
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
        const tabName = firstTab.getAttribute('data-tab');
        if (tabName) {
            switchTab(tabName, firstTab);
        }
    }

    console.log('Prediksi Panel initialized successfully');
}

function setupEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab-button')) {
            const tabName = e.target.getAttribute('data-tab');
            if (tabName) {
                window.switchTab(tabName, e.target);
            }
        }
    });

    document.getElementById('filterTanggal')?.addEventListener('change', filterSalesData);
    document.getElementById('filterProduk')?.addEventListener('change', filterSalesData);
    document.getElementById('filterRiwayatProduk')?.addEventListener('change', filterHistoryData);
    document.getElementById('filterStatus')?.addEventListener('change', filterHistoryData);
    document.getElementById('runPredictionBtn')?.addEventListener('click', runPrediction);
    document.getElementById('addSalesForm')?.addEventListener('submit', handleAddSalesData);
    document.getElementById('exportSalesBtn')?.addEventListener('click', exportSalesData);
    document.getElementById('exportHistoryBtn')?.addEventListener('click', exportHistoryData);
}

window.switchTab = function(tabName, clickedElement) {
    console.log('switchTab called:', tabName);

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    if (clickedElement) clickedElement.classList.add('active');
    const targetPane = document.getElementById(tabName);
    if (targetPane) targetPane.classList.add('active');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        initPrediksiPanel();
    });
} else {
    setupEventListeners();
    initPrediksiPanel();
}