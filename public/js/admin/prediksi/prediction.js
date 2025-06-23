// prediction.js
window.currentChart = window.currentChart || null; // Mengubah deklarasi menjadi properti window

/**
 * Ambil daftar produk dan render ke <select id="predictionProduct">
 */
function loadProductDropdown() {
  fetch('/api/prediksi/produk')
    .then(res => res.json())
    .then(products => {
      window.PRODUCT_MAP = window.PRODUCT_MAP || {}; // Pastikan PRODUCT_MAP didefinisikan jika belum
      const sel = document.getElementById('predictionProduct');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- Pilih Produk --</option>';
      products.forEach(p => {
        window.PRODUCT_MAP[p.id] = p.nama;
        sel.innerHTML += `<option value="${p.id}">${p.nama}</option>`;
      });
    })
    .catch(err => console.error('Gagal load produk:', err));
}

function renderPredictionChart(histori, prediksi) {
    const ctx = document.getElementById('predictionChart').getContext('2d');

    // Hancurkan chart sebelumnya jika ada dan merupakan instance Chart yang valid
    if (window.predictionChart instanceof Chart) {
        window.predictionChart.destroy();
    }

    const labels = [
        ...histori.map(item => item.tanggal), // Tanggal dari histori
        ...prediksi.map(item => item.tanggal_prediksi) // Tanggal dari prediksi
    ];

    const data = [
        ...histori.map(item => item.stok_terjual), // Data historis
        ...prediksi.map(item => item.prediksi_terjual) // Data prediksi
    ];

    // Warna untuk data historis dan data prediksi
    const backgroundColors = [
        ...histori.map(() => 'rgba(75, 192, 192, 0.7)'), // Warna untuk histori
        ...prediksi.map(() => 'rgba(255, 159, 64, 0.7)')  // Warna untuk prediksi
    ];
    const borderColors = [
        ...histori.map(() => 'rgba(75, 192, 192, 1)'),
        ...prediksi.map(() => 'rgba(255, 159, 64, 1)')
    ];


    window.predictionChart = new Chart(ctx, {
        type: 'bar', // Menggunakan bar chart lebih cocok untuk data diskrit per minggu
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Terjual (kg)', // Label yang lebih spesifik
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Penting agar bisa diatur ukurannya via CSS
            plugins: {
                legend: {
                    display: true // Tampilkan legenda jika ada dua jenis data
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah (kg)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + ' kg';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tanggal'
                    },
                    ticks: {
                        maxRotation: 45, // Rotasi label agar tidak tumpang tindih
                        minRotation: 45
                    }
                }
            }
        }
    });
}

/**
 * Jalankan prediksi ke backend, lalu render ringkasan & tabel
 */
function runPrediction() {
  const produkId = parseInt(document.getElementById('predictionProduct').value);

  // Validasi pilihan produk
  if (!produkId) {
    Swal.fire('Peringatan', 'Pilih produk terlebih dahulu!', 'warning');
    return;
  }

  Swal.fire({
    title: 'Sedang memproses prediksi...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  // Kirim hanya produk yang dipilih
  fetch('/api/prediksi/proses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ produk_ids: [produkId], periode_prediksi: 4 }) // Prediksi 4 minggu ke depan
  })
  .then(response => {
    if (!response.ok) {
        // Coba baca pesan error dari respons jika ada
        return response.json().then(errorJson => {
            throw new Error(errorJson.message || 'Network response was not ok');
        });
    }
    return response.json();
  })
  .then(json => {
    Swal.close();

    if (!json.success) {
      throw new Error(json.message || 'Prediksi gagal');
    }

    // Karena `produk_ids` hanya satu, `json.prediksi` seharusnya hanya berisi satu objek
    const data = json.prediksi.find(p => p.produk_id === produkId);

    if (!data) {
      throw new Error('Tidak ada hasil prediksi untuk produk ini. Pastikan ada cukup data penjualan.');
    }
    
    // Tampilkan hasil
    renderPredictionSummary(data); // Kirim langsung objek data, bukan array
    renderPredictionTable(data); // Kirim langsung objek data
    renderPredictionChart(data.histori, data.hasil_prediksi);
    renderRecommendationModal(data); // Tampilkan modal rekomendasi

    document.getElementById('predictionResults').style.display = 'block';
  })
  .catch(err => {
    Swal.close();
    Swal.fire('Error', err.message || 'Terjadi kesalahan saat memuat prediksi', 'error');
    console.error('Prediction error:', err);
  });
}

/**
 * Render ringkasan: Prediksi Minggu Depan & Sisa Stok Saat Ini
 * Menerima satu objek data prediksi, bukan array
 */
function renderPredictionSummary(data) {
  const fp = data.hasil_prediksi && data.hasil_prediksi[0]; // Prediksi untuk minggu pertama
  const namaProduk = window.PRODUCT_MAP[data.produk_id] || `ID ${data.produk_id}`;

  // Prediksi minggu depan
  document.getElementById('prediksiMingguDepan').textContent =
    fp ? `${fp.prediksi_terjual} kg` : '-';
  // Sisa stok saat ini (stok akhir terakhir)
  document.getElementById('sisaStokSaatIni').textContent =
    data.stok_akhir_terakhir != null
      ? `${data.stok_akhir_terakhir} kg`
      : '-';
    
    // Tampilkan peringatan jika ada
    const warningElement = document.getElementById('predictionWarning');
    if (warningElement) {
        if (data.peringatan) {
            warningElement.textContent = `Peringatan: ${data.peringatan}`;
            warningElement.style.display = 'block';
        } else {
            warningElement.style.display = 'none';
        }
    }
}

/**
 * Render tabel detail prediksi
 * Menerima satu objek data prediksi, bukan array
 */
function renderPredictionTable(data) {
  const tbody = document.getElementById('predictionTableBody'); // Ini mungkin perlu ID yang berbeda di HTML
  const tableContainer = document.getElementById('predictionTableContainer'); // Tambahkan container untuk tabel
  
  if (!tbody || !tableContainer) {
    console.error("Elemen 'predictionTableBody' atau 'predictionTableContainer' tidak ditemukan.");
    return;
  }
  tbody.innerHTML = ''; // Kosongkan tabel sebelum mengisi

  if (!data || !data.hasil_prediksi || data.hasil_prediksi.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999">Belum ada hasil prediksi untuk produk ini</td></tr>`;
    tableContainer.style.display = 'none'; // Sembunyikan tabel jika tidak ada data
    return;
  }
  tableContainer.style.display = 'block'; // Tampilkan tabel jika ada data


  // Loop melalui setiap item prediksi (minggu 1, minggu 2, dst)
  data.hasil_prediksi.forEach((fp, index) => {
    const nama = window.PRODUCT_MAP[data.produk_id] || `ID ${data.produk_id}`;
    const tanggal = fp.tanggal_prediksi;
    const predTerjual = fp.prediksi_terjual;
    const safetyStock = fp.safety_stock;
    const rekomendasiRestockPerMinggu = fp.rekomendasi_restock_per_minggu;

    tbody.innerHTML += `
      <tr>
        <td>${nama}</td>
        <td>${formatDate(tanggal)}</td>
        <td>${predTerjual} kg</td>
        <td>${safetyStock} kg</td>
        <td>${rekomendasiRestockPerMinggu} kg</td>
      </tr>
    `;
  });
}

/**
 * Fungsi untuk menampilkan modal rekomendasi pembelian
 */
function renderRecommendationModal(data) {
    const produkNama = window.PRODUCT_MAP[data.produk_id] || `ID ${data.produk_id}`;
    const prediksiTerjualMingguDepan = data.hasil_prediksi[0] ? data.hasil_prediksi[0].prediksi_terjual : 0;
    const safetyStockValue = data.safety_stock_value || 0; // Ambil safety_stock dari data Python
    const stokAkhirTerakhir = data.stok_akhir_terakhir || 0;
    const rekomendasiPembelianTotal = data.rekomendasi_pembelian; // Ini sudah dihitung di Python sebagai total untuk restock

    // Hitung total prediksi penjualan untuk seluruh periode prediksi (bulan depan)
    let totalPrediksiPenjualanBulanDepan = 0;
    if (data.hasil_prediksi && Array.isArray(data.hasil_prediksi)) {
        totalPrediksiPenjualanBulanDepan = data.hasil_prediksi.reduce((sum, item) => sum + item.prediksi_terjual, 0);
    }

    Swal.fire({
        title: `Rekomendasi Pembelian untuk ${produkNama}`,
        html: `
            <div style="text-align: left; margin-top: 15px;">
                <p><strong>Kira-kira Penjualan Bulan Depan (Total 4 Minggu):</strong> <strong>${totalPrediksiPenjualanBulanDepan} kg</strong></p>
                <p><strong>Stok Akhir Saat Ini:</strong> ${stokAkhirTerakhir} kg</p>
                <p><strong>Safety Stock yang Disarankan:</strong> ${safetyStockValue} kg</p>
                <hr style="margin: 10px 0;">
                <p style="font-size: 1.1em; font-weight: bold;">Disarankan untuk membeli: <span style="color: #28a745;">${rekomendasiPembelianTotal} kg</span></p>
                <p style="font-size: 0.8em; color: #666;">(Didapat dari: Prediksi Minggu Depan + Safety Stock - Stok Akhir Saat Ini)</p>
            </div>
            ${data.peringatan ? `<div style="font-size: 0.9em; color: orange; margin-top: 10px;"><strong>Peringatan:</strong> ${data.peringatan}</div>` : ''}
        `,
        icon: 'info',
        confirmButtonText: 'Oke',
        width: '500px'
    });
}

/**
 * Render panel rekomendasi multi-item (jika diinginkan)
 * Ini tidak digunakan lagi jika kita fokus pada satu produk per prediksi,
 * atau bisa diadaptasi untuk riwayat prediksi. Saya biarkan tapi tidak dipanggil.
 */
function renderMultiPanelRecommendation(prediksiArr) {
  const grid = document.getElementById('recommendationGrid');
  if (!grid) return;
  grid.innerHTML = '';
  // Logika di sini akan perlu diubah jika ingin menampilkan rekomendasi dari beberapa produk.
  // Untuk kasus saat ini, hanya satu produk yang diprediksi per panggilan.
  if (Array.isArray(prediksiArr) && prediksiArr.length > 0) {
      const item = prediksiArr[0]; // Ambil item pertama (dan satu-satunya)
      const nama = window.PRODUCT_MAP[item.produk_id] || `ID ${item.produk_id}`;
      const fp = item.hasil_prediksi && item.hasil_prediksi[0];
      if (!fp) {
        grid.innerHTML += `<div class="recommendation-item"><b>${nama}</b><span class="error">Data kurang</span></div>`;
        return;
      }
      grid.innerHTML += `
        <div class="recommendation-item">
          <b>${nama}</b>
          <div>Prediksi minggu depan: <strong>${fp.prediksi_terjual} kg</strong></div>
          <div>Sisa stok saat ini: <strong>${item.stok_akhir_terakhir} kg</strong></div>
          <div>Rekomendasi beli: <strong>${item.rekomendasi_pembelian} kg</strong></div>
        </div>
      `;
  } else {
      grid.innerHTML += `<div class="recommendation-item"><span class="info">Tidak ada rekomendasi</span></div>`;
  }
}

function formatDate(str) {
  if (!str || str === '-') return '-';
  const [y,m,d] = str.split('-');
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"];
  return `${parseInt(d)} ${bulan[parseInt(m)-1]} ${y}`;
}

// Expose ke global agar bisa dipanggil dari HTML atau init
window.loadProductDropdown = loadProductDropdown;
window.runPrediction = runPrediction;
window.renderMultiPanelRecommendation = renderMultiPanelRecommendation; // Biarkan jika masih ada kasus multi-item
window.renderRecommendationModal = renderRecommendationModal; // Expose fungsi modal

// Otomatis load produk saat halaman siap
document.addEventListener('DOMContentLoaded', loadProductDropdown);
