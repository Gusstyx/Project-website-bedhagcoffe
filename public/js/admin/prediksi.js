// ===================== PREDIKSI PRODUK KOPI =====================
// Data storage - start empty, dummy data removed per request
let salesData = [];
let predictionHistoryData = [];
let filteredData = [];
let currentChart = null;


// ===================== GLOBAL FUNCTIONS (AVAILABLE IMMEDIATELY) =====================
// Make switchTab globally available immediately
window.switchTab = function(tabName, clickedElement) {
    console.log('switchTab called:', tabName);
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Add active class to clicked tab
    if (clickedElement) clickedElement.classList.add('active');
    const targetPane = document.getElementById(tabName);
    if (targetPane) targetPane.classList.add('active');
    
    // Refresh chart if switching to analysis tab
    if (tabName === 'analysis' || tabName === 'prediksi') {
        setTimeout(() => {
            if (typeof renderSalesChart === 'function') {
                renderSalesChart();
            }
        }, 100);
    }
};

// Make other frequently used functions globally available
window.runPrediction = function() {
    if (typeof runPredictionInternal === 'function') {
        runPredictionInternal();
    } else {
        console.error('runPredictionInternal not yet available');
    }
};

window.editSalesData = function(id) {
    if (typeof editSalesDataInternal === 'function') {
        editSalesDataInternal(id);
    } else {
        console.error('editSalesDataInternal not yet available');
    }
};

window.deleteSalesData = function(id) {
    if (typeof deleteSalesDataInternal === 'function') {
        deleteSalesDataInternal(id);
    } else {
        console.error('deleteSalesDataInternal not yet available');
    }
};

window.closeModal = function() {
    const modal = document.getElementById('dynamicModal');
    if (modal) modal.style.display = 'none';
};

window.handleEditData = function(event, id) {
    if (typeof handleEditDataInternal === 'function') {
        handleEditDataInternal(event, id);
    } else {
        console.error('handleEditDataInternal not yet available');
    }
};

window.exportSalesData = function() {
    if (typeof exportSalesDataInternal === 'function') {
        exportSalesDataInternal();
    } else {
        console.error('exportSalesDataInternal not yet available');
    }
};

window.exportHistoryData = function() {
    if (typeof exportHistoryDataInternal === 'function') {
        exportHistoryDataInternal();
    } else {
        console.error('exportHistoryDataInternal not yet available');
    }
};

// ===================== FUNGSI INISIALISASI UTAMA =====================
window.initPrediksiPanel = async function() {
    console.log('Initializing Prediksi Panel...');
    
    // Setup event listeners
    setupEventListeners();
    await populateFilterOptions();
    // Load initial data without generating dummy data
    loadInitialData();
    
    // Render initial display
    initializeDisplay();
    
    // Activate first tab by default
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
        const tabName = firstTab.getAttribute('data-tab');
        if (tabName) {
            switchTab(tabName, firstTab);
        }
    }
    
    console.log('Prediksi Panel initialized successfully');
};

// ===================== SETUP EVENT LISTENERS =====================
function setupEventListeners() {
    // Tab switching - using event delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab-button')) {
            const tabName = e.target.getAttribute('data-tab');
            if (tabName) {
                window.switchTab(tabName, e.target);
            }
        }
    });
    
    // Filter events - sales data
    const filterTanggal = document.getElementById('filterTanggal');
    const filterProduk = document.getElementById('filterProduk');
    if (filterTanggal) filterTanggal.addEventListener('change', filterSalesData);
    if (filterProduk) filterProduk.addEventListener('change', filterSalesData);
    
    // Filter events - history data
    const filterRiwayatProduk = document.getElementById('filterRiwayatProduk');
    const filterStatus = document.getElementById('filterStatus');
    if (filterRiwayatProduk) filterRiwayatProduk.addEventListener('change', filterHistoryData);
    if (filterStatus) filterStatus.addEventListener('change', filterHistoryData);
    
    // Prediction form
    const runPredictionBtn = document.getElementById('runPredictionBtn');
    if (runPredictionBtn) runPredictionBtn.addEventListener('click', window.runPrediction);
    
    // Add data form
    const addDataForm = document.getElementById('addDataForm');
    if (addDataForm) addDataForm.addEventListener('submit', handleAddData);
    
    // Export buttons
    const exportSalesBtn = document.getElementById('exportSalesBtn');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportSalesBtn) exportSalesBtn.addEventListener('click', window.exportSalesData);
    if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', window.exportHistoryData);
}

// ===================== DATA MANAGEMENT =====================
function loadInitialData() {
    // Dummy data generation removed - data is empty
    // Placeholder for future API or database data loading
    // loadDataFromAPI();
}

// ===================== DISPLAY FUNCTIONS =====================
function initializeDisplay() {
    filteredData = [...salesData];
    renderSalesData(filteredData);
    renderHistoryData();
    updateAccuracyStats();
    populateFilterOptions();
}

async function fetchProdukList() {
    try {
        const response = await fetch('/api/prediksi/produk'); // Pastikan path sesuai routing backend kamu
        return await response.json();
    } catch (e) {
        return [];
    }
}

async function populateFilterOptions() {
    // Ambil data produk dari backend
    const produkList = await fetchProdukList();

    // Simpan mapping produk jika ingin pakai di bagian lain (opsional)
    window.PRODUCT_MAP = {};
    produkList.forEach(prod => {
        window.PRODUCT_MAP[prod.id] = prod.nama;
    });

    // Populate filter produk (sales)
    const filterProduk = document.getElementById('filterProduk');
    if (filterProduk) {
        filterProduk.innerHTML = '<option value="">Semua Produk</option>';
        produkList.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = prod.nama;
            filterProduk.appendChild(option);
        });
    }

    // Jika ada dropdown produk lain (misal pada form tambah/edit)
    const predictionProduct = document.getElementById('predictionProduct');
    if (predictionProduct) {
        predictionProduct.innerHTML = '';
        produkList.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = prod.nama;
            predictionProduct.appendChild(option);
        });
    }
    // dst. untuk dropdown lain kalau perlu...
}

function renderSalesData(data = filteredData) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-inbox"></i><br>
                    Belum ada data penjualan
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const efficiency = ((item.stok_terjual / item.stok_awal) * 100).toFixed(1);
        const efficiencyColor = efficiency >= 80 ? '#28a745' : efficiency >= 60 ? '#ffc107' : '#dc3545';
        
        row.innerHTML = `
            <td>${item.id}</td>
            <td><strong>${item.produk_nama}</strong></td>
            <td>${formatDate(item.tanggal_minggu)}</td>
            <td><span class="badge badge-info">${item.stok_awal} kg</span></td>
            <td><span class="badge badge-success">${item.stok_terjual} kg</span></td>
            <td><span class="badge badge-warning">${item.stok_akhir} kg</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editSalesData(${item.id})" title="Edit Data">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteSalesData(${item.id})" title="Hapus Data">
                        <i class="fas fa-trash"></i>
                    </button>
                    <span class="efficiency-badge" style="color: ${efficiencyColor};" title="Efisiensi Penjualan">
                        ${efficiency}%
                    </span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update summary stats
    updateSalesSummary(data);
}

function renderHistoryData(data = predictionHistoryData) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-history"></i><br>
                    Belum ada riwayat prediksi
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const row = document.createElement('tr');
        const statusColor = getAccuracyColor(item.akurasi);
        const selisih = Math.abs(item.prediksi_terjual - item.aktual_terjual);
        const trend = item.prediksi_terjual > item.aktual_terjual ? '↓' : item.prediksi_terjual < item.aktual_terjual ? '↑' : '→';
        
        row.innerHTML = `
            <td>${formatDate(item.tanggal_prediksi)}</td>
            <td><strong>${item.produk}</strong></td>
            <td><span class="badge badge-primary">${item.prediksi_terjual} kg</span></td>
            <td><span class="badge badge-success">${item.aktual_terjual} kg</span></td>
            <td>
                <span class="accuracy-badge" style="background-color: ${statusColor};">
                    ${item.akurasi}%
                </span>
            </td>
            <td style="color: ${statusColor}; font-weight: bold;">
                <i class="fas fa-${getStatusIcon(item.status)}"></i> ${item.status}
            </td>
            <td>
                <span class="trend-indicator" title="Selisih Prediksi vs Aktual">
                    ${trend} ${selisih} kg
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateAccuracyStats(data);
}

// ===================== FILTERING FUNCTIONS =====================
function filterSalesData() {
    const filterTanggal = document.getElementById('filterTanggal')?.value || '';
    const filterProduk = document.getElementById('filterProduk')?.value || '';
    
    filteredData = salesData.filter(item => {
        const matchTanggal = !filterTanggal || item.tanggal_minggu === filterTanggal;
        const matchProduk = !filterProduk || item.produk_id === filterProduk;
        return matchTanggal && matchProduk;
    });
    
    renderSalesData(filteredData);
}

function filterHistoryData() {
    const filterProduk = document.getElementById('filterRiwayatProduk')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    
    const filtered = predictionHistoryData.filter(item => {
        const matchProduk = !filterProduk || item.produk === filterProduk;
        // Status filter adjustment: since in history, status options may vary, we filter on item.status directly
        const matchStatus = !filterStatus || item.status === filterStatus;
        return matchProduk && matchStatus;
    });
    
    renderHistoryData(filtered);
}

// ===================== PREDICTION ENGINE =====================
function runPredictionInternal() {
    const productSelect = document.getElementById('predictionProduct');
    const periodSelect = document.getElementById('predictionPeriod');
    
    if (!productSelect || !periodSelect) {
        showNotification('Form prediksi tidak ditemukan', 'error');
        return;
    }
    
    const product = productSelect.value;
    const period = parseInt(periodSelect.value);
    
    if (!product || !period) {
        showNotification('Pilih produk dan periode prediksi', 'warning');
        return;
    }
    
    if (salesData.length === 0) {
        showNotification('Belum ada data penjualan untuk membuat prediksi', 'error');
        return;
    }
    
    // Show loading
    showNotification('Sedang membuat prediksi...', 'info');
    
    setTimeout(() => {
        try {
            const predictions = generatePrediction(product, period);
            renderPredictionResults(predictions, PRODUCT_MAP[product]);
            document.getElementById('predictionResults').style.display = 'block';
            showNotification('Prediksi berhasil dibuat!', 'success');
        } catch (error) {
            showNotification('Error saat membuat prediksi: ' + error.message, 'error');
        }
    }, 1000);
}

function generatePrediction(productId, periods) {
    const productData = salesData.filter(item => item.produk_id === productId);
    
    if (productData.length === 0) {
        throw new Error('Tidak ada data historis untuk produk yang dipilih');
    }
    
    // Calculate trends and averages
    const salesHistory = productData.map(item => item.stok_terjual);
    const avgSales = salesHistory.reduce((sum, val) => sum + val, 0) / salesHistory.length;
    const trend = calculateTrend(salesHistory);
    const seasonality = calculateSeasonality(productData);
    
    const predictions = [];
    let currentDate = new Date();
    let currentStock = productData[productData.length - 1]?.stok_akhir || 20;
    
    for (let i = 0; i < periods; i++) {
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Advanced prediction algorithm
        let predictedSales = avgSales;
        predictedSales += trend * (i + 1); // Apply trend
        predictedSales *= seasonality; // Apply seasonality
        predictedSales += (Math.random() - 0.5) * 5; // Add some randomness
        predictedSales = Math.max(1, Math.round(predictedSales));
        
        const newStock = Math.max(0, currentStock - predictedSales);
        const confidence = Math.max(70, 95 - (i * 5)); // Confidence decreases over time
        
        predictions.push({
            periode: i + 1,
            tanggal: currentDate.toISOString().split('T')[0],
            prediksi_terjual: predictedSales,
            stok_awal: currentStock,
            sisa_stok: newStock,
            confidence: confidence,
            status: getStockStatus(newStock),
            rekomendasi: getRecommendation(newStock, predictedSales)
        });
        
        // Simulate restocking
        if (newStock <= 5) {
            currentStock = newStock + 50; // Auto restock
        } else {
            currentStock = newStock;
        }
    }
    
    return predictions;
}

function calculateTrend(salesData) {
    if (salesData.length < 3) return 0;
    
    const n = salesData.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = salesData.reduce((sum, val) => sum + val, 0);
    const sumXY = salesData.reduce((sum, val, index) => sum + val * (index + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

function calculateSeasonality(productData) {
    // Simple seasonality based on month
    const currentMonth = new Date().getMonth();
    const seasonalFactors = [0.9, 0.85, 0.95, 1.1, 1.2, 1.15, 1.0, 0.95, 1.05, 1.1, 1.05, 1.2];
    return seasonalFactors[currentMonth];
}

function getStockStatus(stock) {
    if (stock > 15) return 'Aman';
    if (stock > 5) return 'Perlu Restok';
    if (stock > 0) return 'Stok Menipis';
    return 'Stok Habis';
}

function getRecommendation(stock, predictedSales) {
    const safetyStock = 10;
    const neededStock = predictedSales + safetyStock;
    
    if (stock >= neededStock) {
        return 'Stok mencukupi';
    } else {
        const shortfall = neededStock - stock;
        return `Tambah ${shortfall} kg`;
    }
}

// ===================== RENDER PREDICTION RESULTS =====================
function renderPredictionResults(predictions, productName) {
    const resultsContainer = document.getElementById('predictionResults');
    if (!resultsContainer) return;
    
    // Render summary
    const summaryDiv = document.getElementById('predictionSummary');
    if (summaryDiv) summaryDiv.innerHTML = '';
    
    // Render table
    const tbody = document.getElementById('predictionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    predictions.forEach(pred => {
        const row = document.createElement('tr');
        const statusColor = getStockStatusColor(pred.status);
        const confidenceColor = getConfidenceColor(pred.confidence);
        
        row.innerHTML = `
            <td><strong>${productName}</strong></td>
            <td>${formatDate(pred.tanggal)}</td>
            <td>
                <span class="badge badge-primary">${pred.prediksi_terjual} kg</span>
                <small class="confidence-indicator" style="color: ${confidenceColor};">
                    (${pred.confidence}% yakin)
                </small>
            </td>
            <td><span class="badge badge-info">${pred.stok_awal} kg</span></td>
            <td><span class="badge badge-warning">${pred.sisa_stok} kg</span></td>
            <td style="color: ${statusColor}; font-weight: bold;">
                <i class="fas fa-${getStatusIcon(pred.status)}"></i> ${pred.status}
            </td>
            <td>
                <span class="recommendation-text">
                    ${pred.rekomendasi}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Render chart
    renderPredictionChart(predictions, productName);
}

// ===================== CHART FUNCTIONS =====================
function renderSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Prepare data
    const chartData = prepareSalesChartData();
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah (kg)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Minggu'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Trend Penjualan Produk Kopi'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function renderPredictionChart(predictions, productName) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    const labels = predictions.map(p => formatDate(p.tanggal));
    const salesDataSet = predictions.map(p => p.prediksi_terjual);
    const stockDataSet = predictions.map(p => p.sisa_stok);
    const confidenceDataSet = predictions.map(p => p.confidence);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Prediksi Penjualan',
                    data: salesDataSet,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Sisa Stok',
                    data: stockDataSet,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Tingkat Keyakinan (%)',
                    data: confidenceDataSet,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah (kg)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Keyakinan (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Prediksi ${productName}`
                }
            }
        }
    });
}

function prepareSalesChartData() {
    const products = [...new Set(salesData.map(item => item.produk_nama))];
    const dates = [...new Set(salesData.map(item => item.tanggal_minggu))].sort();
    
    const datasets = products.map((product, index) => {
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545'];
        const data = dates.map(date => {
            const item = salesData.find(s => s.produk_nama === product && s.tanggal_minggu === date);
            return item ? item.stok_terjual : 0;
        });
        
        return {
            label: product,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4
        };
    });
    
    return {
        labels: dates.map(date => formatDate(date)),
        datasets: datasets
    };
}

// ===================== UTILITY FUNCTIONS =====================
function updateSalesSummary(data) {
    const summaryDiv = document.getElementById('salesSummary');
    if (!summaryDiv || data.length === 0) return;
    
    const totalSold = data.reduce((sum, item) => sum + item.stok_terjual, 0);
    const totalStock = data.reduce((sum, item) => sum + item.stok_awal, 0);
    const avgEfficiency = data.length > 0 ? (totalSold / totalStock * 100).toFixed(1) : 0;
    const bestProduct = data.reduce((best, current) => 
        current.stok_terjual > best.stok_terjual ? current : best, data[0] || {});
    
    summaryDiv.innerHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <h4>Total Terjual</h4>
                <p>${totalSold} kg</p>
            </div>
            <div class="stat-item">
                <h4>Efisiensi Rata-rata</h4>
                <p>${avgEfficiency}%</p>
            </div>
            <div class="stat-item">
                <h4>Produk Terlaris</h4>
                <p>${bestProduct?.produk_nama || 'N/A'}</p>
            </div>
            <div class="stat-item">
                <h4>Total Data</h4>
                <p>${data.length} record</p>
            </div>
        </div>
    `;
}

function updateAccuracyStats(data = predictionHistoryData) {
    const statsDiv = document.getElementById('accuracyStats');
    if (!statsDiv || data.length === 0) return;
    
    const avgAccuracy = data.reduce((sum, item) => sum + item.akurasi, 0) / data.length;
    const excellentCount = data.filter(item => item.akurasi >= 90).length;
    const goodCount = data.filter(item => item.akurasi >= 80 && item.akurasi < 90).length;
    const needsImprovement = data.filter(item => item.akurasi < 70).length;
    
    statsDiv.innerHTML = `
        <div class="accuracy-overview">
            <div class="accuracy-item">
                <h4>Akurasi Rata-rata</h4>
                <p class="accuracy-value" style="color: ${getAccuracyColor(avgAccuracy)};">
                    ${avgAccuracy.toFixed(1)}%
                </p>
            </div>
            <div class="accuracy-item">
                <h4>Sangat Baik (≥90%)</h4>
                <p>${excellentCount} prediksi</p>
            </div>
            <div class="accuracy-item">
                <h4>Baik (80-89%)</h4>
                <p>${goodCount} prediksi</p>
            </div>
            <div class="accuracy-item">
                <h4>Perlu Perbaikan (<70%)</h4>
                <p>${needsImprovement} prediksi</p>
            </div>
        </div>
    `;
}

// ===================== DATA MANAGEMENT FUNCTIONS =====================
function handleAddData(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const newData = {
        id: salesData.length + 1,
        produk_id: formData.get('produk'),
        produk_nama: PRODUCT_MAP[formData.get('produk')],
        tanggal_minggu: formData.get('tanggal'),
        stok_awal: parseInt(formData.get('stokAwal')),
        stok_terjual: parseInt(formData.get('stokTerjual')),
        stok_akhir: parseInt(formData.get('stokAwal')) - parseInt(formData.get('stokTerjual'))
    };
    
    // Validasi data
    if (newData.stok_terjual > newData.stok_awal) {
        showNotification('Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    
    if (newData.stok_akhir < 0) {
        showNotification('Stok akhir tidak boleh negatif', 'error');
        return;
    }
    
    salesData.push(newData);
    filteredData = [...salesData];
    
    renderSalesData(filteredData);
    populateFilterOptions();
    event.target.reset();
    
    showNotification('Data berhasil ditambahkan', 'success');
}

function editSalesDataInternal(id) {
    const item = salesData.find(s => s.id === id);
    if (!item) {
        showNotification('Data tidak ditemukan', 'error');
        return;
    }
    
    showEditModal(item);
}

function deleteSalesDataInternal(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        return;
    }
    
    const index = salesData.findIndex(s => s.id === id);
    if (index === -1) {
        showNotification('Data tidak ditemukan', 'error');
        return;
    }
    
    salesData.splice(index, 1);
    filteredData = salesData.filter(item => {
        const filterTanggal = document.getElementById('filterTanggal')?.value || '';
        const filterProduk = document.getElementById('filterProduk')?.value || '';
        const matchTanggal = !filterTanggal || item.tanggal_minggu === filterTanggal;
        const matchProduk = !filterProduk || item.produk_id === filterProduk;
        return matchTanggal && matchProduk;
    });
    
    renderSalesData(filteredData);
    showNotification('Data berhasil dihapus', 'success');
}

function handleEditDataInternal(event, id) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const index = salesData.findIndex(s => s.id === id);
    
    if (index === -1) {
        showNotification('Data tidak ditemukan', 'error');
        return;
    }
    
    const stokAwal = parseInt(formData.get('stokAwal'));
    const stokTerjual = parseInt(formData.get('stokTerjual'));
    
    if (stokTerjual > stokAwal) {
        showNotification('Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    
    salesData[index] = {
        ...salesData[index],
        produk_id: formData.get('produk'),
        produk_nama: PRODUCT_MAP[formData.get('produk')],
        tanggal_minggu: formData.get('tanggal'),
        stok_awal: stokAwal,
        stok_terjual: stokTerjual,
        stok_akhir: stokAwal - stokTerjual
    };
    
    filterSalesData();
    window.closeModal();
    showNotification('Data berhasil diperbarui', 'success');
}

// ===================== MODAL FUNCTIONS =====================
function showEditModal(item) {
    const modal = document.getElementById('dynamicModal');
    if (!modal) return;
    
    const productOptions = Object.entries(PRODUCT_MAP)
        .map(([id, name]) => `<option value="${id}" ${id === item.produk_id ? 'selected' : ''}>${name}</option>`)
        .join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Data Penjualan</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form onsubmit="handleEditData(event, ${item.id})">
                    <div class="form-group">
                        <label>Produk:</label>
                        <select name="produk" required>
                            ${productOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tanggal Minggu:</label>
                        <input type="date" name="tanggal" value="${item.tanggal_minggu}" required>
                    </div>
                    <div class="form-group">
                        <label>Stok Awal (kg):</label>
                        <input type="number" name="stokAwal" value="${item.stok_awal}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Stok Terjual (kg):</label>
                        <input type="number" name="stokTerjual" value="${item.stok_terjual}" min="0" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
                        <button type="submit" class="btn btn-primary">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// ===================== EXPORT FUNCTIONS =====================
function exportSalesDataInternal() {
    if (filteredData.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    
    const headers = ['ID', 'Produk', 'Tanggal Minggu', 'Stok Awal (kg)', 'Stok Terjual (kg)', 'Stok Akhir (kg)', 'Efisiensi (%)'];
    const csvData = filteredData.map(item => [
        item.id,
        item.produk_nama,
        item.tanggal_minggu,
        item.stok_awal,
        item.stok_terjual,
        item.stok_akhir,
        ((item.stok_terjual / item.stok_awal) * 100).toFixed(1)
    ]);
    
    downloadCSV([headers, ...csvData], 'data_penjualan_kopi.csv');
    showNotification('Data berhasil diekspor', 'success');
}

function exportHistoryDataInternal() {
    if (predictionHistoryData.length === 0) {
        showNotification('Tidak ada riwayat untuk diekspor', 'warning');
        return;
    }
    
    const headers = ['Tanggal Prediksi', 'Produk', 'Prediksi Terjual (kg)', 'Aktual Terjual (kg)', 'Akurasi (%)', 'Status'];
    const csvData = predictionHistoryData.map(item => [
        item.tanggal_prediksi,
        item.produk,
        item.prediksi_terjual,
        item.aktual_terjual,
        item.akurasi,
        item.status
    ]);
    
    downloadCSV([headers, ...csvData], 'riwayat_prediksi_kopi.csv');
    showNotification('Riwayat berhasil diekspor', 'success');
}

function downloadCSV(data, filename) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ===================== HELPER FUNCTIONS =====================
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Jakarta'
    };
    return date.toLocaleDateString('id-ID', options);
}

function getAccuracyColor(accuracy) {
    if (accuracy >= 90) return '#28a745';
    if (accuracy >= 80) return '#17a2b8';
    if (accuracy >= 70) return '#ffc107';
    return '#dc3545';
}

function getStockStatusColor(status) {
    switch (status) {
        case 'Aman': return '#28a745';
        case 'Perlu Restok': return '#ffc107';
        case 'Stok Menipis': return '#fd7e14';
        case 'Stok Habis': return '#dc3545';
        default: return '#6c757d';
    }
}

function getConfidenceColor(confidence) {
    if (confidence >= 90) return '#28a745';
    if (confidence >= 80) return '#17a2b8';
    if (confidence >= 70) return '#ffc107';
    return '#dc3545';
}

function getStatusIcon(status) {
    switch (status) {
        case 'Sangat Baik': return 'check-circle';
        case 'Baik': return 'check';
        case 'Cukup': return 'minus-circle';
        case 'Perlu Perbaikan': return 'exclamation-triangle';
        case 'Aman': return 'shield-alt';
        case 'Perlu Restok': return 'exclamation-circle';
        case 'Stok Menipis': return 'exclamation-triangle';
        case 'Stok Habis': return 'times-circle';
        default: return 'question-circle';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and type
    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.classList.remove('show')">&times;</button>
        </div>
    `;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// ===================== REAL-TIME FEATURES =====================
function simulateRealTimeUpdates() {
    // Simulate new sales data coming in
    setInterval(() => {
        if (Math.random() > 0.8) { // 20% chance every interval
            addRandomSalesData();
        }
    }, 30000); // Check every 30 seconds
}

function addRandomSalesData() {
    const products = Object.keys(PRODUCT_MAP);
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const newData = {
        id: salesData.length + 1,
        produk_id: randomProduct,
        produk_nama: PRODUCT_MAP[randomProduct],
        tanggal_minggu: lastWeek.toISOString().split('T')[0],
        stok_awal: Math.floor(Math.random() * 30) + 20,
        stok_terjual: Math.floor(Math.random() * 20) + 5,
        stok_akhir: 0
    };
    
    newData.stok_akhir = newData.stok_awal - newData.stok_terjual;
    
    salesData.push(newData);
    
    // Update display if on data tab
    const activeTab = document.querySelector('.tab-pane.active');
    if (activeTab && activeTab.id === 'data') {
        filterSalesData();
        showNotification(`Data baru ditambahkan: ${newData.produk_nama}`, 'info');
    }
}

// ===================== PERFORMANCE MONITORING =====================
function monitorPerformance() {
    const performanceData = {
        loadTime: performance.now(),
        dataSize: salesData.length + predictionHistoryData.length,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
        renderTime: 0
    };
    
    console.log('Performance Metrics:', performanceData);
    return performanceData;
}

// ===================== ERROR HANDLING =====================
function handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    showNotification(`Terjadi kesalahan: ${error.message}`, 'error');
}

// ===================== DATA VALIDATION =====================
function validateSalesData(data) {
    const requiredFields = ['produk_id', 'tanggal_minggu', 'stok_awal', 'stok_terjual'];
    
    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            throw new Error(`Field ${field} harus diisi`);
        }
    }
    
    if (data.stok_awal <= 0) {
        throw new Error('Stok awal harus lebih dari 0');
    }
    
    if (data.stok_terjual < 0) {
        throw new Error('Stok terjual tidak boleh negatif');
    }
    
    if (data.stok_terjual > data.stok_awal) {
        throw new Error('Stok terjual tidak boleh lebih dari stok awal');
    }
    
    return true;
}

function openAddSalesModal() {
  const modal = document.getElementById('addSalesModal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    console.error('Modal element with ID "addSalesModal" not found.');
  }
}

function closeAddSalesModal() {
  const modal = document.getElementById('addSalesModal');
  if (modal) {
    modal.style.display = 'none';
  } else {
    console.error('Modal element with ID "addSalesModal" not found.');
  }
}


// ===================== INITIALIZATION =====================
window.runPredictionInternal = runPredictionInternal;
window.editSalesDataInternal = editSalesDataInternal;
window.deleteSalesDataInternal = deleteSalesDataInternal;
window.handleEditDataInternal = handleEditDataInternal;
window.exportSalesDataInternal = exportSalesDataInternal;
window.exportHistoryDataInternal = exportHistoryDataInternal;
window.openAddSalesModal = openAddSalesModal;  
window.closeAddSalesModal = closeAddSalesModal;



// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initPrediksiPanel);
} else {
    window.initPrediksiPanel();
}

console.log('Coffee Prediction System - All modules loaded successfully');