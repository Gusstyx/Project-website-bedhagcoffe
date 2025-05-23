import { initDeleteButtons } from './common.js';

export function initPredictionManagement() {
    document.getElementById('upload-prediction-data')?.addEventListener('click', function() {
        const fileInput = document.getElementById('prediction-file-input');
        if (fileInput.files.length === 0) {
            alert('Silakan pilih file terlebih dahulu');
            return;
        }

        const fileName = fileInput.files[0].name;
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${new Date().toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</td>
            <td>${fileName}</td>
            <td>${new Date().toLocaleDateString('id-ID')}</td>
            <td><span class="badge badge-success">Diproses</span></td>
            <td class="actions">
                <button class="btn btn-secondary btn-sm view-prediction-data">Lihat</button>
                <button class="btn btn-danger btn-sm delete-prediction-data">Hapus</button>
            </td>
        `;
        document.querySelector('#predictions table tbody').appendChild(newRow);
        document.getElementById('prediction-file-list').innerHTML = '';
    });

    initDeleteButtons();
}