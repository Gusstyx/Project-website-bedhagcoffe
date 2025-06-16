require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./db/mysql');

// ROUTER IMPORT
const produkRouter = require('./routes/produk-routes');
const authRouter = require('./routes/auth');
const manageMitraRouter = require('./routes/mitra-routes');
const salesRouter = require('./routes/sales-routes');
const prediksiRouter = require('./routes/prediksi-routes');
const dokumenRouter = require('./routes/dokumen-routes');      // <== DOKUMEN
const historyRouter = require('./routes/history-routes');      // <== HISTORY

const app = express();

// ======= MIDDLEWARE =======
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasiaSessionKey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24*60*60*1000, sameSite: 'lax' }
}));

// =========== INISIALISASI DB ==============
async function initializeDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();

        // USERS
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
        const [admin] = await connection.query(
            "SELECT id FROM users WHERE email = 'bedhagcoffe@mail.com'"
        );
        if (admin.length === 0) {
            const hashedPass = await bcrypt.hash('admin123', 10);
            await connection.query(
                "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
                ['Admin Bedhag', 'bedhagcoffe@mail.com', hashedPass, 'admin','active']
            );
            console.log('✅ Akun admin berhasil dibuat');
        }

        // PRODUK
        await connection.query(`
            CREATE TABLE IF NOT EXISTS produk (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                harga INT,
                deskripsi TEXT,
                gambar VARCHAR(255)
            )
        `);

        // SALES
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

        // PREDIKSI
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

        // DOKUMEN
        await connection.query(`
            CREATE TABLE IF NOT EXISTS dokumen (
                id INT AUTO_INCREMENT PRIMARY KEY,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT,
                url VARCHAR(255),
                tanggal_upload DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Uploads folder
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
app.use('/api', authRouter);
app.use('/api/mitra', manageMitraRouter);
app.use('/api/produk', produkRouter);
app.use('/api/sales', salesRouter);
app.use('/api/prediksi', prediksiRouter);
app.use('/api/dokumen', dokumenRouter);    // <== DOKUMEN ROUTES
app.use('/api/history', historyRouter);    // <== HISTORY ROUTES

// ====== LOGOUT ROUTE ======
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// ====== STATIC HTML ROUTES ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 5500;
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
});
