// predict-history.js
let predictionHistoryData = [];

async function loadPredictionHistory() {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error('Failed to load prediction history');
        predictionHistoryData = await response.json();
    } catch (error) {
        console.error('Error loading prediction history:', error);
        showNotification('Gagal memuat riwayat prediksi: ' + error.message, 'error');
        predictionHistoryData = [];
    }
}

function renderHistoryData(data = predictionHistoryData) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-history"></i><br />
                    Belum ada riwayat prediksi
                </td>
            </tr>
        `;
        updateAccuracyStats([]);
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

function filterHistoryData() {
    const filterProduk = document.getElementById('filterRiwayatProduk')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const filtered = predictionHistoryData.filter(item => {
        const matchProduk = !filterProduk || item.produk === filterProduk;
        const matchStatus = !filterStatus || item.status === filterStatus;
        return matchProduk && matchStatus;
    });
    renderHistoryData(filtered);
}

function updateAccuracyStats(data = predictionHistoryData) {
    const statsDiv = document.getElementById('accuracyStats');
    if (!statsDiv || data.length === 0) {
        if (statsDiv) statsDiv.innerHTML = '<p>Tidak ada data akurasi untuk ditampilkan.</p>';
        return;
    }

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

function exportHistoryData() {
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

window.loadPredictionHistory = loadPredictionHistory;
window.renderHistoryData = renderHistoryData;
window.filterHistoryData = filterHistoryData;
window.updateAccuracyStats = updateAccuracyStats;
window.exportHistoryData = exportHistoryData;