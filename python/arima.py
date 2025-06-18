# arima.py (Orde ARIMA Diubah menjadi (1,1,0))
import sys
import json
import pandas as pd
import numpy as np
import warnings
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")

def run_prediction():
    try:
        # Baca input JSON dari stdin
        raw = sys.stdin.read()
        params = json.loads(raw)
        sales_data_from_db = params.get("sales", [])
        periode_prediksi = int(params.get("periode_prediksi", 4)) # Default 4 minggu untuk sebulan ke depan

        sys.stderr.write(f"DEBUG: Input sales data received: {len(sales_data_from_db)} records\n")

        # Buat DataFrame
        df = pd.DataFrame(sales_data_from_db)

        # Pastikan kolom yang dibutuhkan ada dan data tidak kosong
        required_cols = ["produk_id", "tanggal_minggu", "stok_terjual", "stok_awal"]
        if df.empty or not all(col in df.columns for col in required_cols):
            error_message = {"error": "Data penjualan tidak lengkap atau kosong. Pastikan ada produk_id, tanggal_minggu, stok_terjual, dan stok_awal."}
            sys.stderr.write(f"ERROR: {error_message['error']}\n")
            print(json.dumps([error_message]))
            sys.exit(0)

        results = []

        for produk_id in df['produk_id'].unique():
            data_produk = df[df['produk_id'] == produk_id].copy()
            data_produk['tanggal_minggu'] = pd.to_datetime(data_produk['tanggal_minggu'])
            data_produk = data_produk.sort_values('tanggal_minggu')

            # Set index dan pastikan frekuensi mingguan, isi missing dengan 0
            series = data_produk.set_index('tanggal_minggu')['stok_terjual'].asfreq('W-MON').fillna(0)
            jumlah_minggu = len(series)

            sys.stderr.write(f"DEBUG: Processing produk_id {produk_id}, {jumlah_minggu} weeks of data.\n")

            # Inisialisasi variabel penting
            hasil_prediksi = []
            histori = []
            stok_akhir_terakhir = 0 # Default ke 0, akan diupdate
            peringatan = None

            # Hitung stok akhir terakhir dari data terakhir yang tersedia
            if not data_produk.empty and 'stok_awal' in data_produk.columns and 'stok_terjual' in data_produk.columns:
                last_entry = data_produk.iloc[-1]
                stok_akhir_terakhir = int(last_entry['stok_awal'] - last_entry['stok_terjual'])
                if stok_akhir_terakhir < 0:
                    stok_akhir_terakhir = 0
            sys.stderr.write(f"DEBUG: Produk {produk_id}, last stok_akhir_terakhir: {stok_akhir_terakhir}\n")

            # --- Penentuan Safety Stock (Contoh Logika) ---
            safety_stock_value = 5 # Nilai default atau minimal
            if not series.empty and series.sum() > 0:
                if series.std() > 0:
                    safety_stock_value = max(5, int(np.ceil(series.std() * 1.5)))
                else:
                    safety_stock_value = max(5, int(np.ceil(series.mean() * 0.1))) 
            sys.stderr.write(f"DEBUG: Produk {produk_id}, calculated safety_stock_value: {safety_stock_value}\n")
            
            # --- Deteksi Tren Menurun untuk Penyesuaian Rekomendasi ---
            is_downward_trend = False
            if jumlah_minggu >= 5 and series.sum() > 0:
                x_indices = np.arange(jumlah_minggu)
                slope, intercept = np.polyfit(x_indices, series.values, 1)
                if slope < -0.5: # Threshold ini bisa disesuaikan
                    is_downward_trend = True
                    sys.stderr.write(f"DEBUG: Produk {produk_id} DETECTED DOWNWARD TREND with slope: {slope:.2f}\n")
            
            adjusted_safety_stock_for_recommendation = safety_stock_value
            if is_downward_trend:
                adjusted_safety_stock_for_recommendation = max(1, safety_stock_value // 2)
                sys.stderr.write(f"DEBUG: Produk {produk_id} safety_stock ADJUSTED to {adjusted_safety_stock_for_recommendation} due to downward trend.\n")
            
            # Pengecekan data historis untuk prediksi ARIMA
            if jumlah_minggu < 12: # Kurang dari 3 bulan data
                peringatan = 'Data penjualan kurang dari 12 minggu. Prediksi mungkin tidak akurat atau menggunakan estimasi.'
                sys.stderr.write(f"WARNING: {peringatan} for produk_id {produk_id}\n")
                
                # Jika data terlalu sedikit, lakukan prediksi sederhana (misal rata-rata)
                avg_value = series.mean() if not series.empty else 0
                for idx in range(periode_prediksi):
                    tanggal_prediksi = (series.index[-1] + pd.Timedelta(days=7*(idx+1))).strftime('%Y-%m-%d') if not series.empty else (pd.Timestamp.now() + pd.Timedelta(days=7*(idx+1))).strftime('%Y-%m-%d')
                    prediksi_terjual_minggu_ini = int(np.ceil(avg_value))
                    hasil_prediksi.append({
                        "tanggal_prediksi": tanggal_prediksi,
                        "prediksi_terjual": prediksi_terjual_minggu_ini,
                        "safety_stock": safety_stock_value, # Ini safety stock standar
                        "rekomendasi_restock_per_minggu": int(np.ceil(prediksi_terjual_minggu_ini + safety_stock_value)),
                    })
                
                # Buat histori dari data yang tersedia
                histori = [{'tanggal': str(tgl.date()), 'stok_terjual': int(val)} for tgl, val in series.items()]
                
                # Hitung rekomendasi pembelian untuk kasus data kurang
                prediksi_minggu_depan_saat_ini = hasil_prediksi[0]["prediksi_terjual"] if hasil_prediksi else 0
                rekomendasi_pembelian_total = max(0, prediksi_minggu_depan_saat_ini + adjusted_safety_stock_for_recommendation - stok_akhir_terakhir)

                results.append({
                    'produk_id': int(produk_id),
                    'periode_prediksi': periode_prediksi,
                    'stok_akhir_terakhir': stok_akhir_terakhir,
                    'rekomendasi_pembelian': int(rekomendasi_pembelian_total),
                    'peringatan': peringatan,
                    'hasil_prediksi': hasil_prediksi,
                    'histori': histori,
                    'safety_stock_value': safety_stock_value
                })
                continue # Lanjut ke produk berikutnya

            # Peringatan akurasi (jika data cukup untuk ARIMA tapi masih terbatas)
            if 12 <= jumlah_minggu < 20:
                peringatan = "Akurasi prediksi mungkin rendah: disarankan minimal 20 minggu data."
            elif jumlah_minggu >= 20 and jumlah_minggu < 30:
                peringatan = (peringatan or "") + " Akurasi prediksi cukup, tapi sebaiknya gunakan lebih dari 30 minggu data."


            # Proses prediksi ARIMA
            try:
                if series.sum() == 0 and len(series) > 0: # Jika semua stok terjual 0
                    prediksi_list = [0] * periode_prediksi
                    sys.stderr.write(f"INFO: Produk {produk_id} series all zeros, predicting 0.\n")
                else:
                    # >>>>>> DIUBAH KE STATSMODELS ARIMA DENGAN ORDE (1,1,0) <<<<<<
                    model = ARIMA(series, order=(1,1,0)) # Orde ARIMA (p,d,q) diubah ke (1,1,0)
                    model_fit = model.fit()
                    forecast = model_fit.forecast(steps=periode_prediksi)
                    prediksi_list = [float(max(0, x)) for x in forecast] # Pastikan tidak ada nilai negatif
                    sys.stderr.write(f"DEBUG: Produk {produk_id} ARIMA forecast: {prediksi_list}\n")
            except Exception as e:
                # Gunakan nilai rata-rata jika prediksi ARIMA gagal
                avg_value = series.mean() if not series.empty else 0
                prediksi_list = [avg_value] * periode_prediksi
                sys.stderr.write(f"ERROR: ARIMA failed for produk {produk_id}: {str(e)}\n")
                import traceback
                sys.stderr.write(f"TRACE: {traceback.format_exc()}\n")
                peringatan = (peringatan or "") + " Prediksi ARIMA gagal, menggunakan rata-rata historis."


            # Bangun hasil prediksi (untuk setiap periode ke depan)
            hasil_prediksi = []
            for idx in range(periode_prediksi):
                tanggal_prediksi = (series.index[-1] + pd.Timedelta(days=7*(idx+1))).strftime('%Y-%m-%d')
                
                prediksi_terjual_minggu_ini = int(np.ceil(prediksi_list[idx]))
                
                hasil_prediksi.append({
                    "tanggal_prediksi": tanggal_prediksi,
                    "prediksi_terjual": prediksi_terjual_minggu_ini,
                    "safety_stock": safety_stock_value, # Ini safety stock standar
                    "rekomendasi_restock_per_minggu": int(np.ceil(prediksi_terjual_minggu_ini + safety_stock_value)),
                })
            sys.stderr.write(f"DEBUG: Produk {produk_id} hasil_prediksi: {hasil_prediksi}\n")

            # Bangun histori (data penjualan aktual yang digunakan untuk prediksi)
            histori = [{'tanggal': str(tgl.date()), 'stok_terjual': int(val)} for tgl, val in series.items()]
            sys.stderr.write(f"DEBUG: Produk {produk_id} histori: {histori}\n")

            # Hitung rekomendasi pembelian total untuk periode pertama
            prediksi_terjual_minggu_depan = hasil_prediksi[0]["prediksi_terjual"] if hasil_prediksi else 0
            rekomendasi_pembelian_total = max(0, prediksi_terjual_minggu_depan + adjusted_safety_stock_for_recommendation - stok_akhir_terakhir)
            sys.stderr.write(f"DEBUG: Produk {produk_id} rekomendasi_pembelian_total: {rekomendasi_pembelian_total} (Prediksi: {prediksi_terjual_minggu_depan}, Adj. Safety Stock: {adjusted_safety_stock_for_recommendation}, Stok Akhir: {stok_akhir_terakhir})\n")

            results.append({
                'produk_id': int(produk_id),
                'periode_prediksi': periode_prediksi,
                'stok_akhir_terakhir': stok_akhir_terakhir,
                'rekomendasi_pembelian': int(rekomendasi_pembelian_total), # Rekomendasi total untuk minggu depan
                'peringatan': peringatan,
                'hasil_prediksi': hasil_prediksi, # Ini berisi prediksi untuk periode_prediksi minggu ke depan
                'histori': histori,
                'safety_stock_value': safety_stock_value # Ini nilai safety stock standar (tidak disesuaikan)
            })

        # Output hasil dalam format JSON
        print(json.dumps(results))
        print(results)
        sys.stderr.write("DEBUG: Python script finished successfully.\n")

    except Exception as e:
        import traceback
        error_info = {"error": "Python ARIMA gagal: " + str(e), "trace": traceback.format_exc()}
        sys.stderr.write(f"FATAL ERROR: {error_info['error']}\n{error_info['trace']}\n")
        print(json.dumps([error_info]))
        sys.exit(1)

if __name__ == "__main__":
    run_prediction()