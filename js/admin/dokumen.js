import { openModal, closeModal, initDeleteButtons } from './common.js';

export function initDocumentManagement() {
    document.getElementById('add-document-btn')?.addEventListener('click', () => {
        openModal('upload-document-modal-backdrop');
    });

    document.getElementById('save-document-upload')?.addEventListener('click', function(e) {
        e.preventDefault();
        const docTitle = document.getElementById('document-title').value;
        const docType = document.getElementById('document-type-select').value;
        const docFile = document.getElementById('document-file-input').files[0];

        if (!docTitle || !docType || !docFile) {
            alert('Harap isi semua field');
            return;
        }

        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>DOC${String(document.querySelectorAll('#documents-table tbody tr').length + 1).padStart(3, '0')}</td>
            <td>${docTitle}</td>
            <td>${docType.charAt(0).toUpperCase() + docType.slice(1)}</td>
            <td>${document.getElementById('document-partner').value}</td>
            <td>${new Date().toLocaleDateString('id-ID')}</td>
            <td><span class="badge badge-success">Aktif</span></td>
            <td class="actions">
                <button class="btn btn-secondary btn-sm view-document">Lihat</button>
                <button class="btn btn-secondary btn-sm edit-document">Edit</button>
                <button class="btn btn-danger btn-sm delete-document">Hapus</button>
            </td>
        `;
        document.getElementById('documents-table').querySelector('tbody').appendChild(newRow);
        closeModal('upload-document-modal-backdrop');
    });

    initDeleteButtons();
}