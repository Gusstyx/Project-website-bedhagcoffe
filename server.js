// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session'); // Pastikan ini di-import
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./db/mysql');

// ROUTER IMPORT
const produkRouter = require('./routes/produk-routes');
const authRouter = require('./routes/auth');
const manageMitraRouter = require('./routes/mitra-routes');
const salesRouter = require('./routes/sales-routes');
const prediksiRouter = require('./routes/prediksi-routes');
const dokumenRouter = require('./routes/dokumen-routes');
const historyRouter = require('./routes/history-routes');

const app = express();

// ======= MIDDLEWARE =======
app.use(cors({
  origin: 'http://localhost:5500', // HARUS sama dengan URL frontend
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// --- HANYA SATU KALI KONFIGURASI SESSION INI ---
// Konfigurasi Session untuk tanpa timeout
app.use(session({
  secret: process.env.SESSION_SECRET || 'rahasiaSessionKey',
  resave: false, // Disarankan false kecuali ada alasan kuat
  saveUninitialized: false, // Disarankan false untuk sesi baru yang belum dimodifikasi
  cookie: {
    httpOnly: true,
    sameSite: 'lax', 
    secure: false
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Middleware untuk parsing JSON body (penting untuk menerima data dari frontend)
app.use(express.json()); // Tambahkan ini jika belum ada.


// =========== INISIALISASI DB ==========
async function initializeDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();

        // Table users
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

        // Admin default
        const [admin] = await connection.query("SELECT id FROM users WHERE email = 'bedhagcoffe@mail.com'");
        if (admin.length === 0) {
            const hashedPass = await bcrypt.hash('admin123', 10);
            await connection.query(
                "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
                ['Admin Bedhag', 'bedhagcoffe@mail.com', hashedPass, 'admin', 'active']
            );
            console.log('✅ Akun admin berhasil dibuat');
        }

        // Produk
        await connection.query(`
            CREATE TABLE IF NOT EXISTS produk (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                harga INT,
                deskripsi TEXT,
                gambar VARCHAR(255)
            )
        `);

        // Sales
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

        // Prediksi
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

        // Dokumen
        await connection.query(`
            CREATE TABLE IF NOT EXISTS dokumen (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT,
                dokumen VARCHAR(255),
                pengirim_id INT NOT NULL,
                tanggal_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pengirim_id) REFERENCES users(id)
            )
        `);

        // Folder upload
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    } catch (err) {
        console.error('❌ Gagal inisialisasi database:', err);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

// ====== ROUTER ======
// Pastikan middleware express.json() dan express.urlencoded() berada di atas router
// agar req.body terisi dengan benar.
app.use('/api', authRouter);
app.use('/api/mitra', manageMitraRouter);
app.use('/api/produk', produkRouter);
app.use('/api/sales', salesRouter);
app.use('/api/prediksi', prediksiRouter);
app.use('/api/dokumen', dokumenRouter);
app.use('/api/history', historyRouter);

// Middleware untuk cek session user (tetap berguna untuk debugging)
app.use((req, res, next) => {
  next();
});

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

// Start Server
const PORT = process.env.PORT || 5500;
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
});