let salesData = [];
let filteredSalesData = [];
window.PRODUCT_MAP = window.PRODUCT_MAP || {};

// ========== LOAD PRODUCT MAP ==========
async function loadProductMap() {
    try {
        const response = await fetch('/api/produk');
        if (!response.ok) throw new Error('Gagal load produk');
        const products = await response.json();
        window.PRODUCT_MAP = {};
        products.forEach(p => window.PRODUCT_MAP[p.id] = p.nama);
    } catch (err) {
        window.PRODUCT_MAP = {};
    }
}

// ========== LOAD SALES DATA ==========
async function loadSalesData() {
    try {
        const response = await fetch('/api/sales');
        salesData = await response.json();        // <-- assign ke global salesData!
        filterData();                             // <-- filter dan render otomatis (gunakan filter yang aktif)
        populateFilterOptions();                  // <-- refresh isi filter bulan & produk
    } catch (error) {
        Swal.fire('Gagal', 'Gagal memuat data penjualan', 'error');
    }
}

// ========== POPULATE FILTER OPTION ==========
function populateFilterOptions() {
    const selectTanggal = document.getElementById('filterTanggal');
    const bulanList = [...new Set(salesData.map(item => item.tanggal_minggu.slice(0, 7)))];
    selectTanggal.innerHTML = `<option value="">Semua Tanggal</option>`;
    bulanList.forEach(bln => {
        const [year, month] = bln.split('-');
        const namaBulan = [
            "Januari","Februari","Maret","April","Mei","Juni",
            "Juli","Agustus","September","Oktober","November","Desember"
        ][parseInt(month)-1];
        selectTanggal.innerHTML += `<option value="${bln}">${namaBulan} ${year}</option>`;
    });

    const selectProduk = document.getElementById('filterProduk');
    selectProduk.innerHTML = `<option value="">Semua Produk</option>`;
    for (const [id, name] of Object.entries(window.PRODUCT_MAP || {})) {
        selectProduk.innerHTML += `<option value="${id}">${name}</option>`;
    }
}

// ========== FILTERING ==========
function filterData() {
    const filterBulan = document.getElementById('filterTanggal').value;
    const filterProduk = document.getElementById('filterProduk').value;
    filteredSalesData = salesData.filter(item => {
        const itemBulan = item.tanggal_minggu.slice(0, 7);
        const matchBulan = !filterBulan || itemBulan === filterBulan;
        const matchProduk = !filterProduk || String(item.produk_id) === String(filterProduk);
        return matchBulan && matchProduk;
    });
    renderSalesData(filteredSalesData);
}

// ========== RENDER TABLE ==========
function renderSalesData(data = filteredSalesData) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-inbox"></i><br />Belum ada data penjualan</td></tr>`;
        return;
    }
    data.forEach((item, index) => {
        const efficiency = ((item.stok_terjual / item.stok_awal) * 100).toFixed(1);
        const akurasi = efficiency;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.produk_nama}</strong></td>
            <td>${formatDate(item.tanggal_minggu)}</td>
            <td><span class="badge badge-info">${item.stok_awal} kg</span></td>
            <td><span class="badge badge-success">${item.stok_terjual} kg</span></td>
            <td><span class="badge badge-warning">${item.stok_awal - item.stok_terjual} kg</span></td>
            <td><span class="badge badge-accent">${akurasi}%</span></td>
            <td>
                <button type="button" class="btn btn-sm btn-edit" style="margin-right: 8px;"
                    onclick="editSalesData(${item.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="btn btn-sm btn-delete"
                    onclick="deleteSalesData(${item.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ========== MODAL EDIT ==========
function showEditModal(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editStokAwal').value = item.stok_awal;
    document.getElementById('editStokTerjual').value = item.stok_terjual;
    
    // Tambahkan hidden fields untuk produk_id dan tanggal_minggu
    document.getElementById('editProdukId').value = item.produk_id;
    document.getElementById('editTanggalMinggu').value = item.tanggal_minggu;
    
    // Nonaktifkan pilihan produk
    const selectProduk = document.getElementById('editProduk');
    selectProduk.innerHTML = '';
    for (const [id, name] of Object.entries(window.PRODUCT_MAP)) {
        selectProduk.innerHTML += `<option value="${id}" ${id == item.produk_id ? 'selected' : ''}>${name}</option>`;
    }
    selectProduk.disabled = true; // Nonaktifkan input produk
    
    document.getElementById('editSalesModal').style.display = 'flex';
}

document.getElementById('formEditSales').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    // Gunakan nilai dari hidden fields
    const produk_id = document.getElementById('editProdukId').value;
    const tanggal_minggu = document.getElementById('editTanggalMinggu').value;
    const stok_awal = parseFloat(document.getElementById('editStokAwal').value);
    const stok_terjual = parseFloat(document.getElementById('editStokTerjual').value);

    if (stok_terjual > stok_awal) {
        Swal.fire('Error', 'Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    
    // Hanya kirim stok_awal dan stok_terjual
    const updatedData = { stok_awal, stok_terjual };
    
    try {
        const response = await fetch(`/api/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        } catch (err) {
        Swal.fire('Gagal', 'Gagal memperbarui data: ' + err.message, 'error');
    }
};

// ========== TAMBAH DATA ==========
async function handleAddSalesData(event) {
    event.preventDefault();
    const produk_id = document.getElementById('modalProduct').value;
    const tanggal_minggu = document.getElementById('modalDate').value;
    const stok_awal = parseInt(document.getElementById('modalInitialStock').value, 10);
    const stok_terjual = parseInt(document.getElementById('modalSoldStock').value, 10);

    if (!produk_id || !tanggal_minggu) {
        Swal.fire('Error', 'Produk dan tanggal wajib diisi', 'error');
        return;
    }
    if (stok_terjual > stok_awal) {
        Swal.fire('Error', 'Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    if (stok_awal < 0 || stok_terjual < 0) {
        Swal.fire('Error', 'Stok tidak boleh negatif', 'error');
        return;
    }

    const data = { produk_id, tanggal_minggu, stok_awal, stok_terjual };
    try {
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([data])
        });
        const resJson = await response.json();
        if (!resJson.success) throw new Error(resJson.message || 'Gagal menyimpan data');
        document.getElementById('addSalesForm').reset();
        closeAddSalesModal();
        Swal.fire('Berhasil', 'Data berhasil ditambahkan', 'success');
        await loadSalesData();
    }
    catch (err) {
        Swal.fire('Gagal', 'Gagal menambah data: ' + err.message, 'error');
    }
}

// ========== HAPUS DATA ==========
function deleteSalesData(id) {
    Swal.fire({
        title: 'Konfirmasi Hapus',
        text: "Anda yakin ingin menghapus data penjualan ini?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            confirmDeleteSalesData(id);
        }
    });
}
async function confirmDeleteSalesData(id) {
    try {
        const response = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
        const resJson = await response.json();
        if (!resJson.success) throw new Error(resJson.message || 'Gagal menghapus data');
        await loadSalesData();
        Swal.fire('Berhasil!', 'Data berhasil dihapus.', 'success');
    } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data: ' + error.message, 'error');
    }
}

// ========== EXPORT DATA ==========
function exportSalesData() {
    if (filteredSalesData.length === 0) {
        Swal.fire('Tidak ada data untuk diekspor', '', 'warning');
        return;
    }
    const headers = ['ID', 'Produk', 'Tanggal Minggu', 'Stok Awal (kg)', 'Stok Terjual (kg)', 'Stok Akhir (kg)', 'Efisiensi (%)'];
    const csvData = filteredSalesData.map(item => [
        item.id,
        item.produk_nama,
        item.tanggal_minggu,
        item.stok_awal,
        item.stok_terjual,
        item.stok_awal - item.stok_terjual,
        ((item.stok_terjual / item.stok_awal) * 100).toFixed(1)
    ]);
    downloadCSV([headers, ...csvData], 'data_penjualan_kopi.csv');
    Swal.fire('Berhasil', 'Data berhasil diekspor', 'success');
}

// ========== MODAL TAMBAH ==========
function openAddSalesModal() {
    const modal = document.getElementById('addSalesModal');
    if (modal) {
        modal.style.display = 'block';
        loadProductOptionsToModal && loadProductOptionsToModal();
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

// ========== EDIT DATA (BUKA MODAL) ==========
function editSalesData(id) {
    const item = salesData.find(s => s.id === id);
    if (!item) {
        Swal.fire('Error', 'Data tidak ditemukan', 'error');
        return;
    }
    showEditModal(item);
}

// ========== UTIL FORMAT DATE ==========
function formatDate(str) {
    if (!str) return '';
    const [year, month, day] = str.split('-');
    const namaBulan = [
        "Januari","Februari","Maret","April","Mei","Juni",
        "Juli","Agustus","September","Oktober","November","Desember"
    ];
    return `${parseInt(day)} ${namaBulan[parseInt(month)-1]} ${year}`;
}

function hideEditModal() {
    document.getElementById('editSalesModal').style.display = 'none';
}

// ========== WINDOW BIND ==========
window.loadProductMap = loadProductMap;
window.loadSalesData = loadSalesData;
window.renderSalesData = renderSalesData;
window.filterData = filterData;
window.handleAddSalesData = handleAddSalesData;
window.editSalesData = editSalesData;
window.deleteSalesData = deleteSalesData;
window.exportSalesData = exportSalesData;
window.openAddSalesModal = openAddSalesModal;
window.closeAddSalesModal = closeAddSalesModal;
window.showEditModal = showEditModal;
window.hideEditModal = hideEditModal;

// ========== INISIALISASI ==========
(async function initSalesPage() {
    await loadProductMap();
    await loadSalesData();
})();
