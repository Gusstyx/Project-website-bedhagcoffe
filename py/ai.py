import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error

# 1. Load Dataset
df = pd.read_csv('dataset_stok.csv')
df['Bulan'] = pd.to_datetime(df['Bulan'])
df.set_index('Bulan', inplace=True)

# 2. Visualisasi Data
plt.figure(figsize=(12,6))
plt.plot(df['Penjualan'], label='Penjualan')
plt.plot(df['Stok'], label='Stok')
plt.title('Riwayat Penjualan dan Stok')
plt.legend()
plt.show()

# 3. Pra-pemrosesan Data
# Menghandle missing value
df = df.fillna(method='ffill')

# 4. Membuat Model Prediksi Penjualan
train_size = int(len(df) * 0.8)
train, test = df.iloc[:train_size], df.iloc[train_size:]

# Model ARIMA
model = ARIMA(train['Penjualan'], order=(5,1,0))
model_fit = model.fit()

# Prediksi pada data test
predictions = model_fit.forecast(steps=len(test))
mae = mean_absolute_error(test['Penjualan'], predictions)
print(f'MAE: {mae:.2f}')

# 5. Prediksi Stok Pembalian
def calculate_purchase(predicted_sales, current_stock, buffer=0.2):
    required_stock = predicted_sales * (1 + buffer)
    purchase = max(0, required_stock - current_stock)
    return purchase

# Ambil stok terakhir
last_stock = df['Stok'].iloc[-1]

# Prediksi penjualan bulan berikutnya
predicted_sales = model_fit.forecast(steps=1)[0]

# Hitung pembelian yang diperlukan
recommended_purchase = calculate_purchase(predicted_sales, last_stock)

print(f'Rekomendasi Pembelian Bulan Depan: {recommended_purchase:.0f} unit')
print(f'Prediksi Penjualan: {predicted_sales:.0f} unit')
print(f'Stok Saat Ini: {last_stock} unit')

# 6. Visualisasi Prediksi
plt.figure(figsize=(12,6))
plt.plot(df['Penjualan'], label='Aktual')
plt.plot(predictions, label='Prediksi')
plt.title('Perbandingan Aktual vs Prediksi')
plt.legend()
plt.show()