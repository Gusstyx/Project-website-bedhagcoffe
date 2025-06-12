// Ambil SEMUA mitra dari backend
async function fetchAllMitra() {
    const res = await fetch('/api/mitra/all');
    if (!res.ok) return [];
    return await res.json();
}

// Render tabel pending (butuh persetujuan)
function renderPendingMitra(mitras) {
    const tbody = document.querySelector('#pending-mitra-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (mitras.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Tidak ada mitra yang butuh persetujuan.</td></tr>';
        return;
    }
    mitras.forEach(mitra => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${mitra.id}</td>
            <td>${mitra.name}</td>
            <td>${mitra.email}</td>
            <td><span class="badge badge-warning">${mitra.status}</span></td>
            <td>
                <button class="btn-approve" title="Setujui" data-id="${mitra.id}">✅</button>
                <button class="btn-reject" title="Tolak" data-id="${mitra.id}">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', () => approveMitra(btn.dataset.id));
    });
    tbody.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => rejectMitra(btn.dataset.id));
    });
}

// Render tabel semua mitra (pending & active, bisa hapus)
function renderAllMitra(mitras) {
    const tbody = document.querySelector('#all-mitra-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (mitras.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Tidak ada mitra.</td></tr>';
        return;
    }
    mitras.forEach(mitra => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${mitra.id}</td>
            <td>${mitra.name}</td>
            <td>${mitra.email}</td>
            <td>
                <span class="badge badge-${mitra.status === 'active' ? 'success' : 'warning'}">
                    ${mitra.status}
                </span>
            </td>
            <td>
                <button class="btn-delete" title="Hapus Mitra" data-id="${mitra.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Event listener hapus mitra di semua mitra
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Yakin ingin menghapus mitra ini?')) {
                deleteMitra(btn.dataset.id);
            }
        });
    });
}

// Approve mitra
async function approveMitra(id) {
    if (confirm('Setujui mitra ini?')) {
        const res = await fetch(`/api/mitra/approve/${id}`, { method: 'POST' });
        if (res.ok) alert('Mitra berhasil di-approve!');
        else alert('Gagal approve mitra!');
        loadMitra();
    }
}

// Reject/Tolak mitra (pending)
async function rejectMitra(id) {
    if (confirm('Tolak & hapus mitra ini?')) {
        const res = await fetch(`/api/mitra/${id}`, { method: 'DELETE' });
        if (res.ok) alert('Mitra berhasil dihapus!');
        else alert('Gagal menghapus mitra!');
        loadMitra();
    }
}

// Hapus mitra dari tabel semua mitra
async function deleteMitra(id) {
    const res = await fetch(`/api/mitra/${id}`, { method: 'DELETE' });
    if (res.ok) alert('Mitra berhasil dihapus!');
    else alert('Gagal menghapus mitra!');
    loadMitra();
}

// Loader utama: load data dan render kedua tabel
async function loadMitra() {
    const all = await fetchAllMitra();
    renderPendingMitra(all.filter(mitra => mitra.status === 'pending'));
    renderAllMitra(all.filter(mitra => mitra.status === 'pending' || mitra.status === 'active'));
}

// Agar bisa dipanggil dari loader panel
window.loadPendingMitra = loadMitra;
