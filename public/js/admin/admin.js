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
                    // Bersihkan data login di client
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('userToken');
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
    const logoutMenuItem = document.getElementById('logout-menu');

    menuItems.forEach(item => {
        if (item === logoutMenuItem) {
            item.addEventListener('click', logout);
            return;
        }
        item.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            this.classList.add('active');
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            if (pageTitle && this.querySelector('span')) {
                pageTitle.textContent = this.querySelector('span').textContent;
            }
        });
    });
}

// --------- TABS -----------
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parent = this.parentElement;
            const container = parent.parentElement;
            const target = this.getAttribute('data-target');
            parent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            const targetContent = container.querySelector(`#${target}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

// --------- MODALS ----------
function initModals() {
    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }
    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }
    document.querySelectorAll('.modal-close, .modal-backdrop .btn-secondary').forEach(button => {
        button.addEventListener('click', function() {
            const modalBackdrop = this.closest('.modal-backdrop');
            if (modalBackdrop) modalBackdrop.classList.remove('show');
        });
    });
    window.onclick = function(event) {
        if (event.target.classList && event.target.classList.contains('modal-backdrop')) {
            event.target.classList.remove('show');
        }
    }
}

// --------- FILE UPLOAD ----------
function initFileUploads() {
    const fileUploads = document.querySelectorAll('.file-upload');
    fileUploads.forEach(upload => {
        const input = upload.querySelector('.file-input');
        upload.addEventListener('click', () => input.click());
        upload.addEventListener('dragover', (e) => {
            e.preventDefault();
            upload.style.borderColor = 'var(--primary-color)';
        });
        upload.addEventListener('dragleave', () => {
            upload.style.borderColor = '#ddd';
        });
        upload.addEventListener('drop', (e) => {
            e.preventDefault();
            upload.style.borderColor = '#ddd';
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                updateFileList(input);
            }
        });
        input.addEventListener('change', () => updateFileList(input));
    });

    function updateFileList(input) {
        const fileList = input.closest('.panel-body, .modal-body')?.querySelector('.file-list');
        if (!fileList) return;
        fileList.innerHTML = '';
        if (input.files.length) {
            Array.from(input.files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <div>${file.name} (${formatFileSize(file.size)})</div>
                    <button class="btn btn-danger btn-sm remove-file">Hapus</button>
                `;
                fileList.appendChild(fileItem);
                fileItem.querySelector('.remove-file').addEventListener('click', (e) => {
                    e.preventDefault();
                    fileItem.remove();
                });
            });
        }
    }

    function formatFileSize(size) {
        if (size < 1024) return size + ' B';
        else if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
        else return (size / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// --------- INISIALISASI SAAT DOM READY -----------
document.addEventListener('DOMContentLoaded', () => {
    initPanelNavigation();
    initTabs();
    initModals();
    initFileUploads();
});
