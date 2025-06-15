// utils.js
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
        case 'Sangat Akurat': return 'check-circle';
        case 'Akurat': return 'check';
        case 'Cukup Akurat': return 'minus-circle';
        case 'Tidak Akurat': return 'exclamation-triangle';
        case 'Aman': return 'shield-alt';
        case 'Perlu Restok': return 'exclamation-circle';
        case 'Stok Menipis': return 'exclamation-triangle';
        case 'Stok Habis': return 'times-circle';
        default: return 'question-circle';
    }
}

function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.classList.remove('show')">&times;</button>
        </div>
    `;

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

async function fetchProdukList() {
    try {
        const response = await fetch('/api/prediksi/produk');
        if (!response.ok) throw new Error('Gagal mengambil data produk');
        return await response.json();
    } catch (e) {
        console.error('Gagal mengambil data produk:', e);
        return [];
    }
}

async function loadProductOptionsToModal() {
    try {
        const produkList = await fetchProdukList();
        const select = document.getElementById('modalProduct');
        if (!select) return;

        select.innerHTML = '<option value="">Pilih Produk</option>';
        produkList.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = prod.nama;
            select.appendChild(option);
        });

        window.PRODUCT_MAP = {};
        produkList.forEach(prod => window.PRODUCT_MAP[prod.id] = prod.nama);
    } catch (err) {
        console.error('Gagal load produk:', err);
    }
}

async function populateProductOptions(selectId) {
    try {
        const produkList = await fetchProdukList();
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Pilih Produk</option>';
        produkList.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = prod.nama;
            select.appendChild(option);
        });

        window.PRODUCT_MAP = {};
        produkList.forEach(prod => window.PRODUCT_MAP[prod.id] = prod.nama);
    } catch (err) {
        console.error('Gagal mengisi produk:', err);
    }
}

window.formatDate = formatDate;
window.getAccuracyColor = getAccuracyColor;
window.getStockStatusColor = getStockStatusColor;
window.getConfidenceColor = getConfidenceColor;
window.getStatusIcon = getStatusIcon;
window.showNotification = showNotification;
window.downloadCSV = downloadCSV;
window.fetchProdukList = fetchProdukList;
window.loadProductOptionsToModal = loadProductOptionsToModal;
window.populateProductOptions = populateProductOptions;