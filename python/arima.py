# arima.py (Versi diperbaiki dan diperjelas)
import sys
import json
import pandas as pd
import numpy as np
import traceback
from statsmodels.tsa.arima.model import ARIMA
import warnings

warnings.filterwarnings("ignore")

def run_prediction():
    try:
        raw = sys.stdin.read()
        params = json.loads(raw)
        sales_data_from_db = params.get("sales", [])
        periode_prediksi = int(params.get("periode_prediksi", 4))  # Default 4 minggu

        sys.stderr.write(f"DEBUG: Jumlah data penjualan diterima: {len(sales_data_from_db)} record\n")

        # Buat DataFrame
        df = pd.DataFrame(sales_data_from_db)

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

            # Resample data per minggu (hari Senin), agregasi total stok terjual
            series = data_produk.set_index('tanggal_minggu')['stok_terjual'].resample('W-MON').sum().fillna(0)
            jumlah_minggu = len(series)

            # Logging histori penjualan
            histori = [
                {
                    "tanggal": idx.strftime("%Y-%m-%d"),
                    "stok_terjual": float(val)
                }
                for idx, val in series.items()
            ]

            # Hitung stok akhir terakhir
            stok_akhir_terakhir = 0
            if not data_produk.empty:
                stok_akhir_terakhir = float(data_produk.iloc[-1]['stok_awal']) - float(data_produk.iloc[-1]['stok_terjual'])

            # Safety stock = rata-rata 2 minggu terakhir
            safety_stock_value = 5
            if jumlah_minggu >= 2:
                safety_stock_value = float(series[-2:].mean())

            hasil_prediksi = []
            arima_forecast_debug = []
            peringatan = None
            rekomendasi_pembelian = 0

            if jumlah_minggu >= 4:
                if series.std() == 0:
                    peringatan = "Data stok terjual tidak bervariasi, prediksi tidak dapat dilakukan."
                else:
                    try:
                        model = ARIMA(series, order=(1, 1, 0))
                        model_fit = model.fit()
                        forecast = model_fit.forecast(steps=periode_prediksi)           
                        prediksi_list = [float(max(0, x)) for x in forecast]

                        sys.stderr.write(f"DEBUG: Forecast ARIMA untuk produk_id {produk_id}: {prediksi_list}\n")
                        arima_forecast_debug = prediksi_list

                        for i in range(periode_prediksi):
                            tanggal_prediksi = (series.index[-1] + pd.Timedelta(weeks=i + 1)).strftime("%Y-%m-%d")
                            prediksi_terjual = prediksi_list[i]
                            hasil_prediksi.append({
                                "minggu_ke": i + 1,
                                "tanggal_prediksi": tanggal_prediksi,
                                "prediksi_terjual": int(round(prediksi_terjual)),  # Mengonversi ke integer tanpa koma prediksi_terjual,
                                "safety_stock": round(safety_stock_value, 2),
                                "rekomendasi_restock_per_minggu": max(0, round(prediksi_terjual + safety_stock_value - stok_akhir_terakhir, 2))
                            })

                        total_prediksi = sum(prediksi_list)
                        rekomendasi_pembelian = max(0, int(round(total_prediksi + safety_stock_value - stok_akhir_terakhir, 2)))

                    except Exception as e:
                        peringatan = f"Prediksi ARIMA gagal: {str(e)}"
                        sys.stderr.write(f"WARNING: {peringatan}\n")
            else:
                peringatan = "Data penjualan kurang dari 4 minggu, prediksi tidak dilakukan."

            results.append({
                "produk_id": int(produk_id),
                "histori": histori,
                "hasil_prediksi": hasil_prediksi,
                "arima_forecast_debug": arima_forecast_debug,
                "stok_akhir_terakhir": stok_akhir_terakhir,
                "safety_stock_value": round(safety_stock_value, 2),
                "rekomendasi_pembelian": rekomendasi_pembelian,
                "peringatan": peringatan
            })

        sys.stderr.write("DEBUG: Output hasil prediksi:\n" + json.dumps(results, indent=2) + "\n")
        print(json.dumps(results))
        sys.stderr.write("DEBUG: Script ARIMA selesai dijalankan.\n")

    except Exception as e:
        error_info = {"error": "Python ARIMA gagal: " + str(e), "trace": traceback.format_exc()}
        sys.stderr.write(f"FATAL ERROR: {error_info['error']}\n{error_info['trace']}\n")
        print(json.dumps([error_info]))
        sys.exit(1)

if __name__ == "__main__":
    run_prediction()