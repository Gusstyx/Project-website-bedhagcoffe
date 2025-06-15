// sales.js
let salesData = [];
let filteredSalesData = [];

async function loadSalesData() {
    try {
        const response = await fetch('/api/sales');
        if (!response.ok) throw new Error('Failed to load sales data');
        salesData = await response.json();
        filteredSalesData = [...salesData];
    } catch (error) {
        console.error('Error loading sales data:', error);
        showNotification('Gagal memuat data penjualan: ' + error.message, 'error');
        salesData = [];
        filteredSalesData = [];
    }
}

function renderSalesData(data = filteredSalesData) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-inbox"></i><br />
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
}

function filterSalesData() {
    const filterTanggal = document.getElementById('filterTanggal')?.value || '';
    const filterProduk = document.getElementById('filterProduk')?.value || '';
    filteredSalesData = salesData.filter(item => {
        const matchTanggal = !filterTanggal || item.tanggal_minggu === filterTanggal;
        const matchProduk = !filterProduk || item.produk_id === filterProduk;
        return matchTanggal && matchProduk;
    });
    renderSalesData(filteredSalesData);
}

async function handleAddSalesData(event) {
    event.preventDefault();

    const produk_id = document.getElementById('modalProduct').value;
    const tanggal_minggu = document.getElementById('modalDate').value;
    const stok_awal = parseInt(document.getElementById('modalInitialStock').value, 10);
    const stok_terjual = parseInt(document.getElementById('modalSoldStock').value, 10);

    if (!produk_id || !tanggal_minggu) {
        showNotification('Produk dan tanggal wajib diisi', 'error');
        return;
    }
    if (stok_terjual > stok_awal) {
        showNotification('Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    if (stok_awal < 0 || stok_terjual < 0) {
        showNotification('Stok tidak boleh negatif', 'error');
        return;
    }

    const data = {
        produk_id,
        tanggal_minggu,
        stok_awal,
        stok_terjual,
        stok_akhir: stok_awal - stok_terjual
    };

    try {
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([data])
        });
        if (!response.ok) {
            const errJson = await response.json();
            throw new Error(errJson.message || 'Gagal menyimpan data');
        }

        document.getElementById('addSalesForm').reset();
        closeAddSalesModal();
        showNotification('Data berhasil ditambahkan', 'success');
        await loadSalesData();
        filterSalesData();
    } catch (err) {
        showNotification('Gagal menambah data: ' + err.message, 'error');
    }
}

async function editSalesData(id) {
    const item = salesData.find(s => s.id === id);
    if (!item) {
        showNotification('Data tidak ditemukan', 'error');
        return;
    }
    showEditModal(item);
}

async function deleteSalesData(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
        const response = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Gagal menghapus data');
        await loadSalesData();
        filterSalesData();
        showNotification('Data berhasil dihapus', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Gagal menghapus data: ' + error.message, 'error');
    }
}

async function handleEditSalesData(event, id) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const stokAwal = parseInt(formData.get('stokAwal'));
    const stokTerjual = parseInt(formData.get('stokTerjual'));

    if (stokTerjual > stokAwal) {
        showNotification('Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }

    const updatedData = {
        produk_id: formData.get('produk'),
        produk_nama: window.PRODUCT_MAP[formData.get('produk')] || '',
        tanggal_minggu: formData.get('tanggal'),
        stok_awal: stokAwal,
        stok_terjual: stokTerjual,
        stok_akhir: stokAwal - stokTerjual
    };

    try {
        const response = await fetch(`/api/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        if (!response.ok) throw new Error('Gagal memperbarui data');

        await loadSalesData();
        filterSalesData();
        closeModal();
        showNotification('Data berhasil diperbarui', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Gagal memperbarui data: ' + error.message, 'error');
    }
}

function showEditModal(item) {
    const modal = document.getElementById('dynamicModal');
    if (!modal) return;

    const productOptions = Object.entries(window.PRODUCT_MAP)
        .map(([id, name]) => `<option value="${id}" ${id === item.produk_id ? 'selected' : ''}>${name}</option>`)
        .join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Data Penjualan</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form onsubmit="handleEditSalesData(event, ${item.id})">
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

function exportSalesData() {
    if (filteredSalesData.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
    }

    const headers = ['ID', 'Produk', 'Tanggal Minggu', 'Stok Awal (kg)', 'Stok Terjual (kg)', 'Stok Akhir (kg)', 'Efisiensi (%)'];
    const csvData = filteredSalesData.map(item => [
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

function openAddSalesModal() {
    const modal = document.getElementById('addSalesModal');
    if (modal) {
        modal.style.display = 'block';
        loadProductOptionsToModal();
    } else {
        console.error('Modal element with ID "addSalesModal" not found.');
    }
}

function closeAddSalesModal() {
    const modal = document.getElementById('addSalesModal');
    if (modal) modal.style.display = 'none';
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) modal.style.display = 'none';
}

window.loadSalesData = loadSalesData;
window.renderSalesData = renderSalesData;
window.filterSalesData = filterSalesData;
window.handleAddSalesData = handleAddSalesData;
window.editSalesData = editSalesData;
window.deleteSalesData = deleteSalesData;
window.handleEditSalesData = handleEditSalesData;
window.exportSalesData = exportSalesData;
window.openAddSalesModal = openAddSalesModal;
window.closeAddSalesModal = closeAddSalesModal;
window.closeModal = closeModal;