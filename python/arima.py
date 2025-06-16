import sys
import json
import pandas as pd
import numpy as np
import warnings
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")

try:
    # Baca input JSON dari stdin (Node.js mengirimkan: { sales: [...], periode_prediksi: n })
    raw = sys.stdin.read()
    params = json.loads(raw)
    sales = params.get("sales", [])
    periode_prediksi = int(params.get("periode_prediksi", 1))  # default 1 minggu

    # Buat DataFrame
    df = pd.DataFrame(sales)
    if df.empty or "produk_id" not in df.columns or "tanggal_minggu" not in df.columns or "stok_terjual" not in df.columns:
        print(json.dumps([{"error": "Data penjualan tidak lengkap atau kosong."}]))
        sys.exit(0)

    results = []

    for produk_id in df['produk_id'].unique():
        data_produk = df[df['produk_id'] == produk_id].copy()
        data_produk['tanggal_minggu'] = pd.to_datetime(data_produk['tanggal_minggu'])
        data_produk = data_produk.sort_values('tanggal_minggu')
        series = data_produk.set_index('tanggal_minggu')['stok_terjual'].asfreq('W-MON').fillna(0)
        jumlah_minggu = len(series)

# Di bagian pengecekan data
        if jumlah_minggu < 12:
            # Kirim data histori meskipun tidak bisa prediksi
            results.append({
                'produk_id': int(produk_id),
                'error': 'Data penjualan kurang dari 12 minggu',
                'histori': [{'tanggal': str(tgl.date()), 'stok_terjual': int(val)} for tgl, val in series.items()],
                'stok_akhir_terakhir': stok_akhir_terakhir or 0  # Pastikan selalu ada nilai
            })
            continue

        warning = None
        if 12 <= jumlah_minggu < 16:
            warning = "Akurasi rendah: disarankan minimum 20 minggu data."
        elif 16 <= jumlah_minggu < 20:
            warning = "Akurasi cukup, tapi sebaiknya gunakan >20 minggu data."

        try:
            model = ARIMA(series, order=(1,1,1))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=periode_prediksi)
            prediksi_list = [float(max(0, x)) for x in forecast]
        except Exception as e:
            # Catat error untuk debugging
            print(f"Error pada produk {produk_id}: {str(e)}", file=sys.stderr)
            # Beri nilai default
            prediksi_list = [series.mean()] * periode_prediksi if not series.empty else [0] * periode_prediksi
            safety_stock = 5  # tetap 5 (permintaan user)
            histori = [ {'tanggal': str(tgl.date()), 'stok_terjual': int(val)} for tgl, val in series.items() ]
            hasil_prediksi = []
            for idx in range(periode_prediksi):
                tanggal_prediksi = (series.index[-1] + pd.Timedelta(days=7*(idx+1))).strftime('%Y-%m-%d')
                prediksi_terjual = int(np.ceil(prediksi_list[idx]))
                hasil_prediksi.append({
                    "tanggal_prediksi": tanggal_prediksi,
                    "prediksi_terjual": prediksi_terjual,
                    "safety_stock": safety_stock,
                    "rekomendasi_restock": int(np.ceil(prediksi_terjual + safety_stock)),
                })

        # Hitung sisa stok akhir terakhir minggu terakhir
        if 'stok_awal' in data_produk and 'stok_terjual' in data_produk:
            stok_akhir_terakhir = int(data_produk.iloc[-1]['stok_awal'] - data_produk.iloc[-1]['stok_terjual'])
        else:
            stok_akhir_terakhir = None
        if stok_akhir_terakhir is not None and stok_akhir_terakhir < 0:
            stok_akhir_terakhir = 0

        # Rekomendasi pembelian (restock minggu pertama prediksi dikurangi stok akhir terakhir, minimum 0)
        rekomendasi_pembelian = max(0, hasil_prediksi[0]["rekomendasi_restock"] - stok_akhir_terakhir) if stok_akhir_terakhir is not None else hasil_prediksi[0]["rekomendasi_restock"]

        results.append({
            'produk_id': int(produk_id),
            'periode_prediksi': periode_prediksi,
            'stok_akhir_terakhir': stok_akhir_terakhir,
            'rekomendasi_pembelian': int(rekomendasi_pembelian),
            'peringatan': warning,
            'hasil_prediksi': hasil_prediksi,   # daftar prediksi tiap minggu
            'histori': histori
        })

except Exception as e:
    # Jika terjadi error fatal, tetap output JSON agar backend Node.js tidak error 500
    print(json.dumps([{"error": "Python ARIMA gagal: " + str(e)}]))
    sys.exit(1)
