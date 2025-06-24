// --------- LOGOUT (AJAX + SweetAlert2) -----------
function logout() {
    Swal.fire({
        title: 'Keluar Akun?',
        text: "Apakah Anda yakin ingin keluar?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(response => {
                if (response.ok) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                } else {
                    Swal.fire('Gagal Logout', 'Logout gagal di server.', 'error');
                }
            })
            .catch(() => {
                Swal.fire('Gagal Logout', 'Terjadi error koneksi.', 'error');
            });
        }
    });
}

// --------- PANEL NAVIGATION ----------
function initPanelNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = document.querySelectorAll('.panel');
    const pageTitle = document.getElementById('page-title');
    const logoutMenuItem = document.getElementById('logout-mitra');

    menuItems.forEach(item => {
        if (item === logoutMenuItem) {
            item.addEventListener('click', logout);
            return;
        }
        item.addEventListener('click', function () {
            const target = this.getAttribute('data-target');
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            this.classList.add('active');
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add('active');
            if (pageTitle && this.querySelector('span')) {
                pageTitle.textContent = this.querySelector('span').textContent;
            }
        });
    });
}

// --------- FILE UPLOAD (Drag & Drop Style) ----------
function initFileUploads() {
    const fileUploads = document.querySelectorAll('.file-upload');
    fileUploads.forEach(upload => {
        const input = upload.querySelector('.file-input');
        upload.addEventListener('click', () => input.click());
        upload.addEventListener('dragover', e => {
            e.preventDefault();
            upload.style.borderColor = 'var(--primary-color)';
        });
        upload.addEventListener('dragleave', () => {
            upload.style.borderColor = '#ddd';
        });
        upload.addEventListener('drop', e => {
            e.preventDefault();
            upload.style.borderColor = '#ddd';
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                showFileName(input, upload);
            }
        });
        input.addEventListener('change', () => showFileName(input, upload));
    });

    function showFileName(input, upload) {
        let info = upload.querySelector('.file-info');
        if (!info) {
            info = document.createElement('div');
            info.className = 'file-info';
            upload.appendChild(info);
        }
        if (input.files.length) {
            info.textContent = `${input.files[0].name} (${formatFileSize(input.files[0].size)})`;
        } else {
            info.textContent = '';
        }
    }

    function formatFileSize(size) {
        if (size < 1024) return size + ' B';
        else if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        else return (size / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// --------- FETCH MITRA DATA ----------
async function fetchMitraData() {
    try {
        const response = await fetch('/api/mitra/me', {
            credentials: 'include', // Wajib untuk mengirim cookie
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const mitra = await response.json();
        // Perbaikan: Menggunakan id yang sesuai dengan HTML
        document.getElementById('mitra-username').textContent = mitra.name || '-';
        document.getElementById('mitra-email').textContent = mitra.email || '-';

    } catch (error) {
        console.error('Error:', error);
        const errorEl = document.getElementById('error-message');
        if (errorEl) errorEl.textContent = 'Gagal memuat data. Silakan coba lagi.';
    }
}


async function loadMitradocument() {
    const tbody = document.querySelector('#mitra-dokumen-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    try {
        const res = await fetch('/api/dokumen', { credentials: 'include' });
        const result = await res.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error('Data tidak valid');
        }

        const data = result.data;
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Tidak ada dokumen</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(d => {
            tbody.innerHTML += `
                <tr>
                    <td>${d.judul}</td>
                    <td>
                    <a href="${d.dokumen}" target="_blank" download class="btn btn-sm btn-outline-primary">Unduh</a>
                    </td>
                    <td>${new Date(d.tanggal_upload).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewDokumen(${d.id})">Lihat</button>
                    </td>
                </tr>
            `;
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4">Gagal load data dokumen</td></tr>';
    }
}

async function viewDokumen(id) {
    try {
        const res = await fetch(`/api/dokumen/${id}`, { credentials: 'include' });
        const result = await res.json();

        if (!result.success) {
            throw new Error(result.error || 'Dokumen tidak ditemukan');
        }

        const dokumenUrl = result.data.dokumen;

        // Buka dokumen di tab baru
        window.open(dokumenUrl, '_blank');

    } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Tidak dapat membuka dokumen', 'error');
    }
}

async function loadUploadTable() {
    const tbody = document.querySelector('#mitra-upload-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    try {
        const res = await fetch('/api/dokumen', { credentials: 'include' });
        const result = await res.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error('Data tidak valid');
        }

        const data = result.data;
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Tidak ada dokumen dari admin</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(doc => {
            const dokumenId = doc.id;
            const dokumenJudul = doc.judul;

            tbody.innerHTML += `
                <tr data-id="${dokumenId}">
                    <td>${dokumenJudul}</td>
                    <td>
                        <div class="file-upload" onclick="this.querySelector('input').click()">
                            <div>📁 Pilih file atau seret ke sini</div>
                            <input type="file" class="file-input" data-dokumen-id="${dokumenId}" style="display: none;">
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="submitUpload(this, ${dokumenId})">Upload</button>
                    </td>
                </tr>
            `;
        });

        initDragAndDrop(); // Aktifkan fitur drag & drop

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3">Gagal memuat data</td></tr>';
    }
}

function initDragAndDrop() {
    document.querySelectorAll('.file-upload').forEach(upload => {
        const input = upload.querySelector('input');

        upload.addEventListener('dragover', e => {
            e.preventDefault();
            upload.style.borderColor = '#007bff';
        });

        upload.addEventListener('dragleave', () => {
            upload.style.borderColor = '#ddd';
        });

        upload.addEventListener('drop', e => {
            e.preventDefault();
            upload.style.borderColor = '#ddd';
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                showFileName(upload, input.files[0].name);
            }
        });

        input.addEventListener('change', () => {
            if (input.files.length) {
                showFileName(upload, input.files[0].name);
            }
        });
    });
}

function showFileName(container, filename) {
    let info = container.querySelector('.file-info');
    if (!info) {
        info = document.createElement('div');
        info.className = 'file-info';
        container.appendChild(info);
    }
    info.textContent = filename;
}

async function submitUpload(button, dokumenId) {
    const row = button.closest('tr');
    const input = row.querySelector('input[type="file"]');
    const file = input?.files?.[0];

    if (!file) {
        Swal.fire('Pilih File', 'Silakan pilih dokumen yang akan diunggah.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('dokumenFile', file);
    formData.append('dokumen_id', dokumenId);

    try {
        const response = await fetch('/api/mitra-dokumen/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        // Handle error: jika server membalas HTML (bukan JSON)
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Respon bukan JSON: ${text.slice(0, 100)}...`);
        }

        const result = await response.json();

        if (result.success) {
            Swal.fire('Sukses', 'Dokumen berhasil diunggah!', 'success');
        } else {
            throw new Error(result.message || 'Gagal upload');
        }
    } catch (err) {
        console.error('Upload error:', err);
        Swal.fire('Gagal', err.message || 'Tidak bisa mengunggah dokumen', 'error');
    }
}



// --------- INITIALIZE WHEN DOM READY ----------
document.addEventListener('DOMContentLoaded', () => {
    initPanelNavigation();
    initFileUploads();
    fetchMitraData(); 
    loadUploadTable();
    loadMitradocument();
});