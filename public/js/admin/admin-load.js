// ===================== FUNGSI LOAD PANEL DINAMIS =====================
async function loadContent(target, filename) {
    console.log(`Memuat konten untuk panel: ${target}`);

    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const content = await response.text();
        const targetElement = document.getElementById(target);
        
        if (!targetElement) {
            throw new Error(`Element dengan ID ${target} tidak ditemukan`);
        }

        targetElement.innerHTML = content;
        console.log(`Konten untuk panel ${target} berhasil dimuat`);

        // Handler untuk setiap jenis panel
        const panelHandlers = {
            async predictions() {
                try {
                    await loadScripts([
                        './js/admin/prediksi/utils.js',
                        './js/admin/prediksi/sales.js',
                        './js/admin/prediksi/predict-history.js',
                        './js/admin/prediksi/prediction.js',
                        './js/admin/prediksi/predict-main.js'
                    ]);
                    
                    if (typeof window.initPrediksiPanel === 'function') {
                        window.initPrediksiPanel();
                    }
                } catch (error) {
                    console.error('Gagal memuat modul prediksi:', error);
                    showPanelError(target, 'Gagal memuat modul prediksi');
                }
            },

            async products() {
                try {
                    const module = await import('./produk.js');
                    if (module?.initProductManagement) {
                        module.initProductManagement();
                    } else {
                        console.warn('initProductManagement tidak ditemukan');
                    }
                } catch (error) {
                    console.error('Gagal memuat modul produk:', error);
                    showPanelError(target, 'Gagal memuat modul produk');
                }
            },

            async partners() {
                try {
                    const module = await import('./manage-mitra.js');
                    if (module?.loadPendingMitra) {
                        module.loadPendingMitra();
                    } else if (window.loadPendingMitra) {
                        window.loadPendingMitra(); // Fallback
                    }
                } catch (error) {
                    console.error('Gagal memuat modul mitra:', error);
                    showPanelError(target, 'Gagal memuat modul mitra');
                }
            },

            async documents() {
                try {
                    const module = await import('./dokumen.js');
                    if (module?.initDocumentManagement) {
                        module.initDocumentManagement();
                    } else if (window.initDocumentManagement) {
                        window.initDocumentManagement(); // Fallback
                    }
                } catch (error) {
                    console.error('Gagal memuat modul dokumen:', error);
                    showPanelError(target, 'Gagal memuat modul dokumen');
                }
            }
        };

        // Jalankan handler jika ada
        if (panelHandlers[target]) {
            await panelHandlers[target]();
        }

    } catch (error) {
        console.error(`Gagal memuat konten untuk panel ${target}:`, error);
        showPanelError(target, 'Terjadi kesalahan saat memuat konten');
    }
}

function showPanelError(panelId, message) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.innerHTML += `
            <div class="alert alert-danger">
                ${message}
            </div>
        `;
    }
}

function loadScripts(scripts) {
    return new Promise((resolve, reject) => {
        let loaded = 0;
        
        const loadNext = () => {
            if (loaded >= scripts.length) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = scripts[loaded];
            
            script.onload = () => {
                loaded++;
                loadNext();
            };
            
            script.onerror = () => {
                reject(new Error(`Gagal memuat script: ${scripts[loaded]}`));
            };
            
            document.head.appendChild(script);
        };
        
        loadNext();
    });
}

// ===================== INISIALISASI MENU & ROUTING PANEL =====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initialized');
    
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

    // Inisialisasi panel default
    async function initializeDefaultPanel() {
        const defaultPanel = 'predictions';
        const menuItem = document.querySelector(`.menu-item[data-target="${defaultPanel}"]`);
        const panelElement = document.getElementById(defaultPanel);
        
        if (menuItem && panelElement) {
            setActivePanel(menuItem, panelElement);
            await loadContent(defaultPanel, contentMap[defaultPanel]);
        }
    }

    // Set panel aktif
    function setActivePanel(menuItem, panelElement) {
        // Reset semua aktif
        document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        // Set yang aktif
        menuItem.classList.add('active');
        panelElement.classList.add('active');
        
        // Update judul halaman
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            const target = menuItem.getAttribute('data-target');
            pageTitle.textContent = titleMap[target] || 'Dashboard';
        }
    }

    // Handle klik menu
    function setupMenuListeners() {
        document.querySelectorAll('.menu-item[data-target]').forEach(item => {
            item.addEventListener('click', async function() {
                const target = this.getAttribute('data-target');
                const panel = document.getElementById(target);
                
                if (!panel) {
                    console.error(`Panel ${target} tidak ditemukan`);
                    return;
                }
                
                setActivePanel(this, panel);
                
                if (target !== 'dashboard' && contentMap[target]) {
                    await loadContent(target, contentMap[target]);
                }
            });
        });
    }

    // Jalankan inisialisasi
    initializeDefaultPanel();
    setupMenuListeners();
});