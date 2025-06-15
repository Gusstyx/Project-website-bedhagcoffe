// prediction.js
let currentChart = null;

function runPrediction() {
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

    showNotification('Sedang membuat prediksi...', 'info');

    setTimeout(() => {
        try {
            const predictions = generatePrediction(product, period);
            renderPredictionResults(predictions, window.PRODUCT_MAP[product]);
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

    const salesHistory = productData.map(item => item.stok_terjual);
    const avgSales = salesHistory.reduce((sum, val) => sum + val, 0) / salesHistory.length;
    const trend = calculateTrend(salesHistory);
    const seasonality = calculateSeasonality(productData);
    const predictions = [];
    let currentDate = new Date();
    let currentStock = productData[productData.length - 1]?.stok_akhir || 20;

    for (let i = 0; i < periods; i++) {
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        let predictedSales = avgSales;
        predictedSales += trend * (i + 1);
        predictedSales *= seasonality;
        predictedSales += (Math.random() - 0.5) * 5;
        predictedSales = Math.max(1, Math.round(predictedSales));

        const newStock = Math.max(0, currentStock - predictedSales);
        const confidence = Math.max(70, 95 - (i * 5));

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

        if (newStock <= 5) {
            currentStock = newStock + 50;
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

function renderPredictionResults(predictions, productName) {
    const resultsContainer = document.getElementById('predictionResults');
    if (!resultsContainer) return;

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

    renderPredictionChart(predictions, productName);
}

function renderPredictionChart(predictions, productName) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    const labels = predictions.map(p => formatDate(p.tanggal));
    const salesDataSet = predictions.map(p => p.prediksi_terjual);
    const stockDataSet = predictions.map(p => p.sisa_stok);
    const confidenceDataSet = predictions.map(p => p.confidence);

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
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

window.runPrediction = runPrediction;