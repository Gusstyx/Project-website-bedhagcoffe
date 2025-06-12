// produk.js

export function initProductManagement() {
    loadProducts();

    // Cek null untuk semua elemen
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            clearProductForm();
            const modalTitle = document.getElementById('product-modal-title');
            if (modalTitle) modalTitle.textContent = 'Tambah Produk';
            showModal();
        };
    }

    const saveBtn = document.getElementById('save-product');
    if (saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            await saveProduct();
        };
    }

    const cancelBtn = document.getElementById('cancel-product');
    if (cancelBtn) {
        cancelBtn.onclick = function(e) {
            e.preventDefault();
            Swal.fire({
                title: 'Batalkan Input?',
                text: "Yakin ingin membatalkan input produk?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Batalkan',
                cancelButtonText: 'Kembali Isi',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    closeModal();
                    Swal.fire('Dibatalkan', 'Input produk dibatalkan.', 'info');
                }
            });
        };
    }

    const predBtn = document.getElementById('process-prediction');
    if (predBtn) {
        predBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Memproses...';
            try {
                const res = await fetch('/api/prediksi/proses', { method: 'POST' });
                const result = await res.json();
                if (result.success) {
                    alert('Prediksi berhasil diproses!');
                    if (window.renderPrediksiChart) await window.renderPrediksiChart();
                    if (window.renderPrediksiTable) await window.renderPrediksiTable();
                } else {
                    alert('Prediksi gagal diproses.');
                }
            } catch (e) {
                alert('Gagal memproses prediksi.');
            }
            this.disabled = false;
            this.textContent = 'Proses Prediksi';
        });
    }

    const closeBtn = document.getElementById('close-product-modal');
    if (closeBtn) closeBtn.onclick = closeModal;

    const imgInput = document.getElementById('product-image');
    if (imgInput) {
        imgInput.onchange = function() {
            const file = this.files[0];
            const preview = document.getElementById('image-preview');
            if (!preview) return;
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        };
    }

    const searchInput = document.getElementById('search-product');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTable(this.value);
        });
    }
}

let editingId = null;
let currentImage = "";

async function loadProducts() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    let res, data = [];
    try {
        res = await fetch('/api/produk');
        if (!res.ok) throw new Error('Gagal memuat data');
        data = await res.json();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6">Gagal load data</td></tr>';
        return;
    }
    if (!Array.isArray(data)) {
        tbody.innerHTML = '<tr><td colspan="6">Data produk tidak valid</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    data.forEach(p => {
        tbody.innerHTML += `
            <tr data-id="${p.id}">
                <td>${p.id}</td>
                <td>${p.nama}</td>
                <td>Rp ${parseInt(p.harga).toLocaleString('id-ID')}</td>
                <td>
                    ${p.gambar ? `<img src="${p.gambar}" style="max-width:60px; border-radius:6px;">` : '-'}
                </td>
                <td>${p.deskripsi || ''}</td>
                <td class="actions">
                    <button class="btn btn-secondary btn-sm edit-product" data-id="${p.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-product" data-id="${p.id}">Hapus</button>
                </td>
            </tr>
        `;
    });
    setProductTableEvents(data);
}

function setProductTableEvents(productList) {
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const p = productList.find(item => item.id == id);
            editingId = id;
            currentImage = p.gambar || "";
            document.getElementById('product-id').value = p.id;
            document.getElementById('product-name').value = p.nama;
            document.getElementById('product-price').value = p.harga;
            document.getElementById('product-description').value = p.deskripsi || '';
            const preview = document.getElementById('image-preview');
            if (preview) {
                if (p.gambar) {
                    preview.src = p.gambar;
                    preview.style.display = 'block';
                } else {
                    preview.src = "";
                    preview.style.display = 'none';
                }
            }
            const imgInput = document.getElementById('product-image');
            if (imgInput) imgInput.value = "";
            const modalTitle = document.getElementById('product-modal-title');
            if (modalTitle) modalTitle.textContent = 'Edit Produk';
            showModal();
        };
    });
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('Yakin hapus produk ini?')) {
                await fetch(`/api/produk/${btn.dataset.id}`, {method: 'DELETE'});
                loadProducts();
            }
        }
    });
}

function clearProductForm() {
    editingId = null;
    currentImage = "";
    const formFields = [
        'product-id', 'product-name', 'product-price', 'product-description', 'product-image'
    ];
    formFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
}

async function saveProduct() {
    const nama = document.getElementById('product-name')?.value.trim();
    const harga = document.getElementById('product-price')?.value;
    const deskripsi = document.getElementById('product-description')?.value;
    const gambarInput = document.getElementById('product-image');
    if (!nama || harga === "") {
        Swal.fire('Lengkapi Data', 'Nama dan harga wajib diisi!', 'warning');
        return;
    }
    const formData = new FormData();
    formData.append('nama', nama);
    formData.append('harga', harga);
    formData.append('deskripsi', deskripsi);
    if (gambarInput && gambarInput.files.length > 0) {
        formData.append('gambar', gambarInput.files[0]);
    } else if (editingId && currentImage) {
        formData.append('oldGambar', currentImage);
    }
    let url = '/api/produk';
    let method = 'POST';
    if (editingId) {
        url += '/' + editingId;
        method = 'PUT';
    }
    await fetch(url, { method, body: formData });
    closeModal();
    loadProducts();
}

function showModal() {
    const modalBackdrop = document.getElementById('product-modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}
function closeModal() {
    const modalBackdrop = document.getElementById('product-modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function filterTable(query) {
    query = query.toLowerCase();
    document.querySelectorAll('#products-table tbody tr').forEach(tr => {
        const nama = tr.cells[1].textContent.toLowerCase();
        const deskripsi = tr.cells[4].textContent.toLowerCase();
        if (nama.includes(query) || deskripsi.includes(query)) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });
}

async function updateDataCount() {
    try {
        const res = await fetch('/api/sales');
        if (res.ok) {
            const data = await res.json();
            const el = document.getElementById('dataCount');
            if (el) el.textContent = data.length;
        }
    } catch {
        const el = document.getElementById('dataCount');
        if (el) el.textContent = '0';
    }
}
