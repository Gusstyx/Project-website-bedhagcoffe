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
    const logoutMenuItem = document.getElementById('logout-mitra');

    menuItems.forEach(item => {
        if (item === logoutMenuItem) {
            item.addEventListener('click', logout);
            return;
        }
        item.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            // Ganti panel aktif
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            this.classList.add('active');
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            // Ganti judul halaman
            if (pageTitle && this.querySelector('span')) {
                pageTitle.textContent = this.querySelector('span').textContent;
            }
            // Tambahkan inisialisasi panel lain jika perlu
        });
    });
}

// --------- FILE UPLOAD (optional) ----------
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
            info.textContent = input.files[0].name + ` (${formatFileSize(input.files[0].size)})`;
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

// --------- INISIALISASI SAAT DOM READY -----------
document.addEventListener('DOMContentLoaded', () => {
    initPanelNavigation();
    initFileUploads();
});
