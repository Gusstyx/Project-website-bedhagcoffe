import { openModal, initDeleteButtons } from './common.js';

export function initPartnerManagement() {
    // Approve mitra
    document.querySelectorAll('.approve-partner').forEach(btn => {
        btn.addEventListener('click', function() {
            const partnerRow = this.closest('tr');
            partnerRow.cells[5].innerHTML = '<span class="badge badge-success">Aktif</span>';
            partnerRow.cells[6].innerHTML = `
                <button class="btn btn-secondary btn-sm view-partner" data-id="${partnerRow.cells[0].textContent}">Lihat</button>
                <button class="btn btn-danger btn-sm delete-partner" data-id="${partnerRow.cells[0].textContent}">Hapus</button>
            `;
            
            const activePartnersTable = document.querySelector('#active-partners table tbody');
            activePartnersTable.appendChild(partnerRow.cloneNode(true));
            partnerRow.remove();
        });
    });

    // Reject mitra
    document.querySelectorAll('.reject-partner').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Apakah Anda yakin ingin menolak mitra ini?')) {
                this.closest('tr').remove();
            }
        });
    });

    // View partner
    document.querySelectorAll('.view-partner').forEach(btn => {
        btn.addEventListener('click', function() {
            const partnerRow = this.closest('tr');
            
            const partnerDetails = document.getElementById('partner-details');
            partnerDetails.innerHTML = `
                <div class="form-group">
                    <label>Nama Mitra:</label>
                    <p>${partnerRow.cells[1].textContent}</p>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <p>${partnerRow.cells[2].textContent}</p>
                </div>
                <div class="form-group">
                    <label>Telepon:</label>
                    <p>${partnerRow.cells[3].textContent}</p>
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <p>${partnerRow.cells[5].textContent}</p>
                </div>
            `;
            openModal('partner-modal-backdrop');
        });
    });

    initDeleteButtons();
}