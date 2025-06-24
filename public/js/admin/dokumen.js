// dokumen.js

export function initDocumentManagement() {
    // ===== Helper untuk menampilkan pesan modal =====
    function showMessageModal(title, message, type = 'info') {
        const messageModal = document.getElementById('message-modal');
        if (!messageModal) {
            alert(`${title}: ${message}`);
            return;
        }

        const titleEl = messageModal.querySelector('.modal-title');
        const bodyEl = messageModal.querySelector('.modal-body');
        const closeBtn = messageModal.querySelector('.close');

        titleEl.textContent = title;
        bodyEl.textContent = message;

        messageModal.classList.remove('alert-success', 'alert-danger', 'alert-info');
        messageModal.classList.add(`alert-${type}`);

        messageModal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        if (closeBtn) {
            closeBtn.onclick = () => {
                messageModal.style.display = 'none';
                document.body.style.overflow = '';
            };
        }
    }

    // ====== Modal Dokumen ======
    function showDocumentModal() {
        const modal = document.getElementById('document-modal-backdrop');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeDocumentModal() {
        const modal = document.getElementById('document-modal-backdrop');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    // ====== Modal Edit Dokumen ======
    function showEditModal(doc) {
        const modal = document.getElementById('edit-modal');
        if (!modal) {
            showMessageModal('Error', 'Modal edit tidak ditemukan', 'error');
            return;
        }

        const form = modal.querySelector('#edit-document-form');
        const titleInput = modal.querySelector('#edit-document-title');
        const idInput = modal.querySelector('#edit-document-id');
        const closeBtn = modal.querySelector('.close-button');

        if (!form || !titleInput || !idInput || !closeBtn) {
            showMessageModal('Error', 'Elemen modal edit tidak lengkap', 'error');
            return;
        }

        // Isi form dengan data dokumen
        idInput.value = doc.id;
        titleInput.value = doc.judul || '';

        // Tampilkan modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Handler untuk tombol close
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };

        // Handler untuk submit form
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = 'Menyimpan...';
                submitBtn.disabled = true;

                const response = await fetch(`/api/dokumen/${doc.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        judul: titleInput.value,
                        deskripsi: doc.deskripsi // Mempertahankan deskripsi yang ada
                    }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Gagal memperbarui dokumen');
                }

                showMessageModal('Sukses', 'Dokumen berhasil diperbarui', 'success');
                modal.style.display = 'none';
                await fetchAndRenderDocuments();
            } catch (error) {
                console.error('Update error:', error);
                showMessageModal('Error', error.message, 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        };
    }
    // ====== Elemen DOM ======z
    const addBtn = document.getElementById('tambah-dokumen-btn');
    const form = document.getElementById('document-form');
    const docCloseBtn = document.getElementById('close-document-modal');
    const titleInput = document.getElementById('document-title');
    const descInput = document.getElementById('document-description');
    const fileInput = document.getElementById('document-file-input');
    const existingdokumenInput = document.getElementById('existing-document-dokumen');
    const modalTitle = document.getElementById('document-modal-title');
    const adminTableBody = document.querySelector('#admin-documents-table tbody');
    const mitraTableBody = document.querySelector('#mitra-documents-table tbody');

    const currentUserRole = localStorage.getItem('userRole') || 'mitra';
    const currentUserId = localStorage.getItem('userId');

    // Tambah dokumen
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            modalTitle.textContent = 'Unggah Dokumen Baru';
            if (form) form.reset();
            if (existingdokumenInput) existingdokumenInput.value = '';
            if (fileInput) fileInput.value = '';
            showDocumentModal();
        });
    }

    if (docCloseBtn) {
        docCloseBtn.addEventListener('click', closeDocumentModal);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Mengunggah...';
            submitBtn.disabled = true;

            const judul = titleInput?.value.trim();
            const deskripsi = descInput?.value.trim();
            const dokumenFile = fileInput?.files[0];
            const existingdokumen = existingdokumenInput?.value.trim();

            // Validate input
            if (!judul) {
                showMessageModal('Peringatan', 'Judul dokumen harus diisi', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            if (!dokumenFile && !existingdokumen) {
                showMessageModal('Peringatan', 'Harus memilih file atau dokumen yang sudah ada', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }

            const formData = new FormData();
            formData.append('judul', judul);
            if (deskripsi) formData.append('deskripsi', deskripsi);
            if (dokumenFile) formData.append('dokumenFile', dokumenFile);
            if (existingdokumen) formData.append('existing_dokumen', existingdokumen);

            try {
                const response = await fetch('/api/dokumen', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                // Handle non-OK responses
                if (!response.ok) {
                    let errorMessage = 'Gagal mengunggah dokumen';
                    try {
                        const errorResult = await response.json();
                        errorMessage = errorResult.error || errorResult.message || errorMessage;
                    } catch (parseError) {
                        console.error('Error parsing error response:', parseError);
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();
                showMessageModal('Sukses', result.message || 'Dokumen berhasil diunggah', 'success');
                closeDocumentModal();
                await fetchAndRenderDocuments();
            } catch (error) {
                console.error('Upload error:', error);
                showMessageModal('Error', error.message, 'error');
                if (error.message.includes('Unauthorized') || error.message.includes('Sesi')) {
                    window.location.href = '/login.html';
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

        async function fetchAndRenderDocuments() {
            try {
            adminTableBody.innerHTML = '<tr><td colspan="4">Memuat...</td></tr>';
            mitraTableBody.innerHTML = '<tr><td colspan="6">Memuat...</td></tr>';

            const response = await fetch('/api/dokumen', { credentials: 'include' });
            if (!response.ok) throw new Error('Gagal mengambil dokumen');

            const result = await response.json();
            const docs = result.data;

            renderDocuments(docs);
            } catch (err) {
            console.error('Fetch error:', err);
            }
        }

        function renderDocuments(docs) {
            adminTableBody.innerHTML = '';
            mitraTableBody.innerHTML = '';

            if (!Array.isArray(docs) || docs.length === 0) {
            adminTableBody.innerHTML = '<tr><td colspan="4">Tidak ada dokumen</td></tr>';
            mitraTableBody.innerHTML = '<tr><td colspan="6">Tidak ada dokumen</td></tr>';
            return;
            }

            docs.forEach((doc) => {
            const isMitra = String(doc.pengirim_id) === currentUserId;
            const isAdminUploader = doc.pengirim_role === 'admin';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.judul || '-'}</td>
                <td>${formatDate(doc.tanggal_upload)}</td>
                <td><a href="${doc.dokumen}" target="_blank">Lihat</a></td>
                <td>
                <button class="edit-document" data-id="${doc.id}">Edit</button>
                <button class="delete-document" data-id="${doc.id}">Hapus</button>
                </td>
            `;

            if (currentUserRole === 'admin' && isAdminUploader) {
                adminTableBody.appendChild(row);
            } else if (currentUserRole === 'mitra' && isMitra) {
                mitraTableBody.appendChild(row);
            }
            });
        }

        fetchAndRenderDocuments();

    }

    // Gunakan event delegation untuk tombol dinamis
    function initActionButtons() {
        // Gunakan event delegation yang lebih reliable
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-document');
            
            if (editBtn) {
                const docId = editBtn.dataset.id;
                console.log('Edit button clicked for doc:', docId); // Debugging
                
                try {
                    editBtn.disabled = true;
                    editBtn.textContent = 'Loading...';
                    
                    const response = await fetch(`/api/dokumen/${docId}`);
                    console.log('Response status:', response.status); // Debugging
                    
                    if (!response.ok) {
                        throw new Error('Gagal mengambil data');
                    }
                    
                    const doc = await response.json();
                    console.log('Document data:', doc); // Debugging
                    
                    showEditModal(doc);
                } catch (error) {
                    console.error('Error:', error);
                    alert(`Error: ${error.message}`);
                } finally {
                    editBtn.disabled = false;
                    editBtn.textContent = 'Edit';
                }
            }
        });
    }


document.addEventListener('DOMContentLoaded', initDocumentManagement);