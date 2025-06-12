// ===================== FUNGSI LOAD PANEL DINAMIS =====================
async function loadContent(target, filename) {
    try {
        const response = await fetch(filename);
        if (response.ok) {
            const content = await response.text();
            document.getElementById(target).innerHTML = content;

            // ==== INISIALISASI KHUSUS SETIAP PANEL ====

            // -- Prediksi: pastikan panel prediksi.js sudah di-load
            if (target === 'predictions') {
                try {
                    import('./prediksi.js').then(() => {
                        if (window.initPrediksiPanel) window.initPrediksiPanel();
                    }).catch(() => {
                        if (window.initPrediksiPanel) window.initPrediksiPanel();
                    });
                } catch {
                    if (window.initPrediksiPanel) window.initPrediksiPanel();
                }
            }

            // -- Produk: inisialisasi produk.js hanya setelah panel produk ter-load
            if (target === 'products') {
                import('./produk.js').then(m => {
                    if (m.initProductManagement) m.initProductManagement();
                });
            }

            // -- Mitra: panggil JS mitra hanya setelah panel mitra ter-load
            if (target === 'partners') {
                try {
                    import('./manage-mitra.js').then(() => {
                        if (window.loadPendingMitra) window.loadPendingMitra();
                    }).catch(() => {
                        if (window.loadPendingMitra) window.loadPendingMitra();
                    });
                } catch {
                    if (window.loadPendingMitra) window.loadPendingMitra();
                }
            }
        } else {
            document.getElementById(target).innerHTML = '<div class="error-message">Gagal memuat konten</div>';
        }
    } catch (error) {
        document.getElementById(target).innerHTML = '<div class="error-message">Terjadi kesalahan saat memuat konten</div>';
    }
}

// ===================== INISIALISASI MENU & ROUTING PANEL =====================
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item[data-target]');
    const panels = document.querySelectorAll('.panel');
    const pageTitle = document.getElementById('page-title');

    const contentMap = {
        'products': 'manage-product.html',
        'partners': 'manage-mitra.html',
        'predictions': 'prediksi.html',
        'documents': 'dokumen.html'
    };
    const titleMap = {
        'dashboard': 'Dashboard',
        'products': 'Produk Kopi',
        'partners': 'Mitra Bisnis',
        'predictions': 'Prediksi Produk',
        'documents': 'Dokumen & Kontrak'
    };

    // Otomatis aktifkan panel Prediksi Produk saat pertama kali halaman dibuka
    (async function() {
        const predMenu = document.querySelector('.menu-item[data-target="predictions"]');
        const targetPanel = document.getElementById('predictions');
        if (predMenu && targetPanel) {
            // Set menu prediksi aktif
            menuItems.forEach(mi => mi.classList.remove('active'));
            predMenu.classList.add('active');

            // Set judul halaman
            if (pageTitle) pageTitle.textContent = titleMap['predictions'];

            // Set panel prediksi aktif
            panels.forEach(panel => panel.classList.remove('active'));
            targetPanel.classList.add('active');

            // Load konten prediksi (tabel, chart, dsb)
            await loadContent('predictions', contentMap['predictions']);
        }
    })();

    menuItems.forEach(item => {
        item.addEventListener('click', async function() {
            const target = this.getAttribute('data-target');
            // Switch tab aktif
            menuItems.forEach(mi => mi.classList.remove('active'));
            panels.forEach(panel => panel.classList.remove('active'));
            this.classList.add('active');
            if (pageTitle) pageTitle.textContent = titleMap[target] || 'Dashboard';

            const targetPanel = document.getElementById(target);
            if (targetPanel) {
                targetPanel.classList.add('active');
                // Untuk panel dinamis (bukan dashboard), load HTML-nya
                if (target !== 'dashboard' && contentMap[target]) {
                    await loadContent(target, contentMap[target]);
                    // Panel mitra, inisialisasi manual jika perlu
                    if (target === 'partners' && window.loadPendingMitra) {
                        window.loadPendingMitra();
                    }
                }
            }
        });
    });
});
