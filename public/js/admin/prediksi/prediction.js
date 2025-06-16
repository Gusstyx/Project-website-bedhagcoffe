let currentChart = null;

/**
 * Ambil daftar produk dan render ke <select id="predictionProduct">
 */
function loadProductDropdown() {
  fetch('/api/prediksi/produk')
    .then(res => res.json())
    .then(products => {
      window.PRODUCT_MAP = {};
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
    
    // Hancurkan chart sebelumnya jika ada
    if (window.predictionChart) {
        window.predictionChart.destroy();
    }
    
    const labels = [
        ...histori.map(item => item.tanggal),
        ...prediksi.map(item => item.tanggal_prediksi)
    ];
    
    const data = [
        ...histori.map(item => item.stok_terjual),
        ...prediksi.map(item => item.prediksi_terjual)
    ];
    
    const backgroundColors = [
        ...histori.map(() => 'rgba(75, 192, 192, 0.5)'),
        ...prediksi.map(() => 'rgba(255, 159, 64, 0.5)')
    ];
    
    window.predictionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah (kg)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jumlah (kg)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tanggal'
                    }
                }
            }
        }
    });
}

/**
 * Jalankan prediksi ke backend, lalu render ringkasan & tabel
 */
// Perbaikan fungsi runPrediction
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
    body: JSON.stringify({ produk_ids: [produkId] })
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  })
  .then(json => {
    Swal.close();
    
    if (!json.success) {
      throw new Error(json.message || 'Prediksi gagal');
    }
    
    // Temukan data untuk produk ini
    const data = json.prediksi.find(p => p.produk_id === produkId);
    
    if (!data) {
      throw new Error('Tidak ada hasil prediksi untuk produk ini');
    }
    
    // Tampilkan hasil
    renderPredictionSummary(data);
    renderPredictionTable(data);
    renderPredictionChart(data.histori, data.hasil_prediksi);
    
    document.getElementById('predictionResults').style.display = 'block';
  })
  .catch(err => {
    Swal.close();
    Swal.fire('Error', err.message || 'Terjadi kesalahan', 'error');
    console.error('Prediction error:', err);
  });
}

/**
 * Render ringkasan: Prediksi Minggu Depan & Sisa Stok Saat Ini
 */
function renderPredictionSummary(prediksiArr) {
  const item = Array.isArray(prediksiArr) && prediksiArr[0];
  const fp = item && item.hasil_prediksi && item.hasil_prediksi[0];
  // Prediksi minggu depan
  document.getElementById('prediksiMingguDepan').textContent =
    fp ? `${fp.prediksi_terjual} kg` : '-';
  // Sisa stok saat ini (stok akhir terakhir)
  document.getElementById('sisaStokSaatIni').textContent =
    item && item.stok_akhir_terakhir != null
      ? `${item.stok_akhir_terakhir} kg`
      : '-';
}

/**
 * Render tabel detail prediksi
 */
function renderPredictionTable(prediksiArr) {
  const tbody = document.getElementById('predictionTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!Array.isArray(prediksiArr) || prediksiArr.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999">Belum ada hasil prediksi</td></tr>`;
    return;
  }

  prediksiArr.forEach(item => {
    const nama = window.PRODUCT_MAP[item.produk_id] || `ID ${item.produk_id}`;
    const fp = item.hasil_prediksi && item.hasil_prediksi[0];
    const tanggal = fp ? fp.tanggal_prediksi : '-';
    const predTerjual = fp ? fp.prediksi_terjual : 0;
    const stokAkhir = item.stok_akhir_terakhir != null ? item.stok_akhir_terakhir : 0;
    const sisa = Math.max(0, stokAkhir - predTerjual);

    // Tentukan status
    let status = 'Aman';
    if (sisa <= 0) status = 'Stok Habis';
    else if (fp && sisa < fp.safety_stock) status = 'Stok Menipis';

    tbody.innerHTML += `
      <tr>
        <td>${nama}</td>
        <td>${formatDate(tanggal)}</td>
        <td>${predTerjual} kg</td>
        <td>${sisa} kg</td>
        <td class="${status.toLowerCase().replace(/\s/g,'-')}">${status}</td>
      </tr>
    `;
  });
}

/**
 * Render panel rekomendasi multi-item (jika diinginkan)
 * Bisa dihapus kalau tidak diperlukan
 */
function renderMultiPanelRecommendation(prediksiArr) {
  const grid = document.getElementById('recommendationGrid');
  if (!grid) return;
  grid.innerHTML = '';
  prediksiArr.forEach(item => {
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
      </div>
    `;
  });
}



/**
 * Utility: format YYYY-MM-DD → DD MMMM YYYY
 */
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
window.renderMultiPanelRecommendation = renderMultiPanelRecommendation;

// Otomatis load produk saat halaman siap (jika dipakai di single-page)
document.addEventListener('DOMContentLoaded', loadProductDropdown);
