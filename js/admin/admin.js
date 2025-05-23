// Navigasi panel
export function initPanelNavigation() {
    let currentPanel = 'dashboard';
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = document.querySelectorAll('.panel');
    const pageTitle = document.getElementById('page-title');

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (!target) return;
            
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            this.classList.add('active');
            
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) {
                targetPanel.classList.add('active');
                currentPanel = target;
            }
            
            pageTitle.textContent = this.querySelector('span').textContent;
        });
    });
}

// Fungsi tab
export function initTabs() {
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

// Fungsi modal
export function initModals() {
    // Open modal
    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');
    }

    // Close modal
    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    // Event listeners
    document.querySelectorAll('.modal-close, .modal-backdrop .btn-secondary').forEach(button => {
        button.addEventListener('click', function() {
            const modalBackdrop = this.closest('.modal-backdrop');
            if (modalBackdrop) modalBackdrop.classList.remove('show');
        });
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal-backdrop')) {
            event.target.classList.remove('show');
        }
    }
}

// Fungsi file upload
export function initFileUploads() {
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
        const fileList = input.closest('.panel-body, .modal-body').querySelector('.file-list');
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
        else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
        else return (size / 1048576).toFixed(1) + ' MB';
    }
}

// Fungsi delete umum
export function initDeleteButtons() {
    document.querySelectorAll('.delete-product, .delete-partner, .delete-prediction-data, .delete-document').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                this.closest('tr').remove();
            }
        });
    });
}