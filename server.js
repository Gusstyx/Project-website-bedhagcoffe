// FILE: server.js
require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./db/mysql');

// ======= IMPORT ROUTER =======
const authRouter = require('./routes/auth');
const manageMitraRouter = require('./routes/mitra-routes');
const produkRouter = require('./routes/produk-routes');
const salesRouter = require('./routes/sales-routes');
const prediksiRouter = require('./routes/prediksi-routes');
const dokumenRouter = require('./routes/dokumen-routes');
const historyRouter = require('./routes/history-routes');
const dokumenMitraRoutes = require('./routes/dokumen-mitra-routes');

// ======= MIDDLEWARE GLOBAL =======
app.use(cors({
  origin: 'http://localhost:5500',
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'rahasiaSessionKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
}));

// Untuk parsing form-urlencoded dan JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ======= STATIC FILES =======
// Menerapkan folder public sebagai static, dan folder uploads
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ======= INISIALISASI DATABASE =======
async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'mitra') NOT NULL DEFAULT 'mitra',
        status ENUM('pending', 'active') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [admin] = await connection.query("SELECT id FROM users WHERE email = 'bedhagcoffe@mail.com'");
    if (admin.length === 0) {
      const hashedPass = await bcrypt.hash('admin123', 10);
      await connection.query(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
        ['Admin Bedhag', 'bedhagcoffe@mail.com', hashedPass, 'admin', 'active']
      );
      console.log('✅ Akun admin berhasil dibuat');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS produk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        harga INT,
        deskripsi TEXT,
        gambar VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produk_id INT NOT NULL,
        tanggal_minggu DATE NOT NULL,
        stok_awal FLOAT NOT NULL,
        stok_terjual FLOAT NOT NULL,
        FOREIGN KEY (produk_id) REFERENCES produk(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS prediksi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produk_id INT NOT NULL,
        tanggal_minggu_prediksi DATE NOT NULL,
        jumlah_prediksi FLOAT,
        tanggal_prediksi DATE,
        FOREIGN KEY (produk_id) REFERENCES produk(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dokumen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255) NOT NULL,
        dokumen VARCHAR(255),
        pengirim_id INT NOT NULL,
        tanggal_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pengirim_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS dokumen_mitra (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dokumen_id INT NOT NULL,
        pengirim_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        tanggal_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dokumen_id) REFERENCES dokumen(id) ON DELETE CASCADE,
        FOREIGN KEY (pengirim_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Pastikan folder uploads ada
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  } catch (err) {
    console.error('❌ Gagal inisialisasi database:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

// ======= PASANG ROUTER API =======
// Tambahkan logging untuk verifikasi mounting
console.log('>>> Mounting routers...');
app.use('/api', authRouter);
app.use('/api/mitra', manageMitraRouter);
app.use('/api/produk', produkRouter);
app.use('/api/sales', salesRouter);
app.use('/api/prediksi', prediksiRouter);
app.use('/api/dokumen', dokumenRouter);
app.use('/api/history', historyRouter);
// Untuk mitra-dokumen, sisipkan logging middleware:
app.use('/api/mitra-dokumen', (req, res, next) => {
  console.log(`Incoming request to /api/mitra-dokumen: ${req.method} ${req.url}`);
  next();
}, dokumenMitraRoutes);

console.log('>>> Semua routers telah di-mount.');

// ======= STATIC ROUTES (untuk SPA atau halaman utama) =======
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ======= ERROR HANDLER =======
app.use((err, req, res, next) => {
  console.error('Error handler caught:', err);
  // Pastikan balas JSON, bukan HTML
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

// ======= START SERVER =======
const PORT = process.env.PORT || 5500;
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
});
