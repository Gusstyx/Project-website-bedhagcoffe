// Mengubah deklarasi variabel global menjadi properti window untuk menghindari konflik 'already been declared'
window.salesData = window.salesData || [];
window.filteredSalesData = window.filteredSalesData || [];
window.PRODUCT_MAP = window.PRODUCT_MAP || {};

// ========== LOAD PRODUCT MAP ==========
// Memuat data produk dari API dan memetakannya ke PRODUCT_MAP
async function loadProductMap() {
    try {
        const response = await fetch('/api/produk');
        if (!response.ok) throw new Error('Gagal load produk');
        const products = await response.json();
        window.PRODUCT_MAP = {}; // Reset PRODUCT_MAP setiap kali dimuat
        products.forEach(p => window.PRODUCT_MAP[p.id] = p.nama);
    } catch (err) {
        // Jika gagal memuat, pastikan PRODUCT_MAP tetap objek kosong
        window.PRODUCT_MAP = {};
        Swal.fire('Gagal', 'Gagal memuat daftar produk: ' + err.message, 'error');
    }
}

// ========== LOAD SALES DATA ==========
// Memuat semua data penjualan dari API
async function loadSalesData() {
    try {
        const response = await fetch('/api/sales');
        window.salesData = await response.json();        // <-- assign ke global salesData!
        filterData();                             // <-- filter dan render otomatis (gunakan filter yang aktif)
        populateFilterOptions();                  // <-- refresh isi filter bulan & produk
    } catch (error) {
        Swal.fire('Gagal', 'Gagal memuat data penjualan', 'error');
    }
}

// ========== POPULATE FILTER OPTION ==========
// Mengisi opsi filter untuk tanggal (bulan) dan produk
function populateFilterOptions() {
    const selectTanggal = document.getElementById('filterTanggal');
    const bulanList = [...new Set(window.salesData.map(item => item.tanggal_minggu.slice(0, 7)))].sort(); // Urutkan bulan
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
    // Urutkan produk berdasarkan nama
    const sortedProducts = Object.entries(window.PRODUCT_MAP || {}).sort(([,nameA], [,nameB]) => nameA.localeCompare(nameB));
    for (const [id, name] of sortedProducts) {
        selectProduk.innerHTML += `<option value="${id}">${name}</option>`;
    }
}

// ========== FILTERING ==========
// Memfilter data penjualan berdasarkan pilihan filter
function filterData() {
    const filterBulan = document.getElementById('filterTanggal').value;
    const filterProduk = document.getElementById('filterProduk').value;
    window.filteredSalesData = window.salesData.filter(item => {
        const itemBulan = item.tanggal_minggu.slice(0, 7);
        const matchBulan = !filterBulan || itemBulan === filterBulan;
        const matchProduk = !filterProduk || String(item.produk_id) === String(filterProduk);
        return matchBulan && matchProduk;
    });
    renderSalesData(window.filteredSalesData);
}

// ========== RENDER TABLE ==========
// Merender data penjualan ke dalam tabel HTML
function renderSalesData(data = window.filteredSalesData) {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return; // Pastikan tbody ada
    tbody.innerHTML = ''; // Kosongkan isi tabel

    if (data.length === 0) {
        // Tampilkan pesan jika tidak ada data
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-inbox"></i><br />Belum ada data penjualan</td></tr>`;
        return;
    }
    data.forEach((item, index) => {
        const efficiency = ((item.stok_terjual / item.stok_awal) * 100).toFixed(1);
        const akurasi = efficiency; // Menggunakan efisiensi sebagai akurasi
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
// Menampilkan modal edit dengan data item yang dipilih
function showEditModal(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editStokAwal').value = item.stok_awal;
    document.getElementById('editStokTerjual').value = item.stok_terjual;
    
    // Tambahkan hidden fields untuk produk_id dan tanggal_minggu
    document.getElementById('editProdukId').value = item.produk_id;
    document.getElementById('editTanggalMinggu').value = item.tanggal_minggu;
    
    // Nonaktifkan pilihan produk di modal edit
    const selectProduk = document.getElementById('editProduk');
    selectProduk.innerHTML = '';
    for (const [id, name] of Object.entries(window.PRODUCT_MAP)) {
        selectProduk.innerHTML += `<option value="${id}" ${id == item.produk_id ? 'selected' : ''}>${name}</option>`;
    }
    selectProduk.disabled = true; // Nonaktifkan input produk
    
    // Menggunakan window.openModal dari admin.js
    if (typeof window.openModal === 'function') {
        window.openModal('editSalesModal');
    } else {
        document.getElementById('editSalesModal').style.display = 'flex'; // Fallback jika window.openModal tidak ada
    }
}

// Event handler saat form edit disubmit
document.getElementById('formEditSales').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    // Gunakan nilai dari hidden fields
    // PASTIKAN produk_id DIUBAH KE INTEGER
    const produk_id = parseInt(document.getElementById('editProdukId').value, 10);
    const tanggal_minggu = document.getElementById('editTanggalMinggu').value;
    const stok_awal = parseFloat(document.getElementById('editStokAwal').value);
    const stok_terjual = parseFloat(document.getElementById('editStokTerjual').value);

    if (stok_terjual > stok_awal) {
        Swal.fire('Error', 'Stok terjual tidak boleh lebih dari stok awal', 'error');
        return;
    }
    
    // Kirim semua data yang diperlukan untuk update, termasuk produk_id dan tanggal_minggu
    const updatedData = { produk_id, tanggal_minggu, stok_awal, stok_terjual };
    
    try {
        const response = await fetch(`/api/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        const resJson = await response.json();
        if (!resJson.success) throw new Error(resJson.message || 'Gagal memperbarui data');
        
        // Menggunakan window.closeModal dari admin.js
        if (typeof window.closeModal === 'function') {
            window.closeModal('editSalesModal');
        } else {
            hideEditModal(); // Fallback
        }
        Swal.fire('Berhasil', 'Data berhasil diperbarui', 'success');
        await loadSalesData(); // Muat ulang data untuk menampilkan perubahan
    } catch (err) {
        Swal.fire('Gagal', 'Gagal memperbarui data: ' + err.message, 'error');
    }
};

// ========== TAMBAH DATA ==========
// Menangani penambahan data penjualan baru
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
        
        // Menggunakan window.closeModal dari admin.js
        if (typeof window.closeModal === 'function') {
            window.closeModal('addSalesModal');
        } else {
            closeAddSalesModal(); // Fallback
        }
        Swal.fire('Berhasil', 'Data berhasil ditambahkan', 'success');
        await loadSalesData();
    }
    catch (err) {
        Swal.fire('Gagal', 'Gagal menambah data: ' + err.message, 'error');
    }
}

// ========== HAPUS DATA ==========
// Menampilkan konfirmasi hapus data
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
// Melakukan penghapusan data setelah konfirmasi
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
// Mengekspor data penjualan ke format CSV
function exportSalesData() {
    if (window.filteredSalesData.length === 0) {
        Swal.fire('Tidak ada data untuk diekspor', '', 'warning');
        return;
    }
    const headers = ['ID', 'Produk', 'Tanggal Minggu', 'Stok Awal (kg)', 'Stok Terjual (kg)', 'Stok Akhir (kg)', 'Efisiensi (%)'];
    const csvData = window.filteredSalesData.map(item => [
        item.id,
        item.produk_nama,
        item.tanggal_minggu,
        item.stok_awal,
        item.stok_terjual,
        item.stok_awal - item.stok_terjual,
        ((item.stok_terjual / item.stok_awal) * 100).toFixed(1)
    ]);
    // Fungsi downloadCSV diasumsikan ada di tempat lain, atau bisa ditambahkan di sini
    downloadCSV([headers, ...csvData], 'data_penjualan_kopi.csv');
    Swal.fire('Berhasil', 'Data berhasil diekspor', 'success');
}

// Fungsi dummy untuk downloadCSV (Anda mungkin memiliki implementasi sebenarnya di tempat lain)
function downloadCSV(data, filename) {
    const csvContent = data.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// ========== MODAL TAMBAH ==========
// Membuka modal tambah data penjualan baru
function openAddSalesModal() {
    // Menggunakan window.openModal dari admin.js
    if (typeof window.openModal === 'function') {
        window.openModal('addSalesModal');
        // loadProductOptionsToModal diasumsikan ada dan mengisi dropdown produk di modal tambah
        loadProductOptionsToModal && loadProductOptionsToModal(); 
    } else {
        const modal = document.getElementById('addSalesModal');
        if (modal) {
            modal.style.display = 'block'; // Fallback
            loadProductOptionsToModal && loadProductOptionsToModal(); 
        } else {
            console.error('Modal element with ID "addSalesModal" not found.');
        }
    }
}
// Menutup modal tambah data penjualan
function closeAddSalesModal() {
    // Menggunakan window.closeModal dari admin.js
    if (typeof window.closeModal === 'function') {
        window.closeModal('addSalesModal');
    } else {
        const modal = document.getElementById('addSalesModal');
        if (modal) modal.style.display = 'none'; // Fallback
    }
}
// Menutup modal generik (jika ada) - Ini mungkin duplikat, tergantung bagaimana admin.js menangani closeModal
// Saya akan biarkan ini dulu, tapi perhatikan potensi konflik
function closeModal() {
    const modal = document.getElementById('dynamicModal'); // Asumsi ini ID modal umum
    if (modal) modal.style.display = 'none';
}

// ========== EDIT DATA (BUKA MODAL) ==========
// Mencari item penjualan berdasarkan ID dan menampilkan modal edit
function editSalesData(id) {
    const item = window.salesData.find(s => s.id === id);
    if (!item) {
        Swal.fire('Error', 'Data tidak ditemukan', 'error');
        return;
    }
    showEditModal(item);
}

// ========== UTIL FORMAT DATE ==========
// Memformat string tanggal dari UCLA-MM-DD menjadi "DD Bulan UCLA"
function formatDate(str) {
    if (!str) return '';
    const [year, month, day] = str.split('-');
    const namaBulan = [
        "Januari","Februari","Maret","April","Mei","Juni",
        "Juli","Agustus","September","Oktober","November","Desember"
    ];
    return `${parseInt(day)} ${namaBulan[parseInt(month)-1]} ${year}`;
}

// Menutup modal edit data penjualan
function hideEditModal() {
    // Menggunakan window.closeModal dari admin.js
    if (typeof window.closeModal === 'function') {
        window.closeModal('editSalesModal');
    } else {
        document.getElementById('editSalesModal').style.display = 'none'; // Fallback
    }
}

// ========== WINDOW BIND ==========
// Mengikat fungsi-fungsi ke objek window agar dapat diakses secara global di HTML
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
window.closeModal = closeModal; 

// ========== INISIALISASI ==========
// Fungsi inisialisasi yang dijalankan saat halaman dimuat
(async function initSalesPage() {
    await loadProductMap(); // Muat peta produk terlebih dahulu
    await loadSalesData();  // Lalu muat data penjualan
})();
