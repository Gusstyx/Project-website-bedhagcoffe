import sys
import json
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

# Baca data dari stdin (dikirim Node.js)
raw = sys.stdin.read()
sales = json.loads(raw)
df = pd.DataFrame(sales)

results = []
for produk_id in df['produk_id'].unique():
    data_produk = df[df['produk_id'] == produk_id].copy()
    # Pastikan tanggal dalam format datetime
    data_produk['tanggal_minggu'] = pd.to_datetime(data_produk['tanggal_minggu'])
    # Set index ke tanggal_minggu dan urutkan
    series = data_produk.set_index('tanggal_minggu')['stok_terjual'].sort_index()
    # Set frekuensi mingguan (pakai hari Senin sebagai awal minggu)
    series = series.asfreq('W-MON')

    # Handle missing minggu (jika ada NaN karena minggu bolong, bisa isi 0 atau forward fill)
    series = series.fillna(0)

    if len(series) < 2:
        continue

    # Training ARIMA
    model = ARIMA(series, order=(1,1,1))
    model_fit = model.fit()
    forecast = model_fit.forecast(steps=1)

    # Ambil minggu prediksi berikutnya
    next_week = series.index[-1] + pd.Timedelta(days=7)
    results.append({
        'produk_id': int(produk_id),
        'tanggal_minggu_prediksi': next_week.strftime('%Y-%m-%d'),
        'jumlah_prediksi': float(forecast.iloc[0])
    })

# Output JSON ke stdout (dibaca backend Node.js)
print(json.dumps(results))
