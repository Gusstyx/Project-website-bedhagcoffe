const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();

// ======================
//  KONFIGURASI DASAR
// ======================
const PORT = process.env.PORT || 5500;

// ======================
//  MIDDLEWARE
// ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
//  VALIDASI REGISTRASI
// ======================
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  
  // Validasi field kosong
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Semua field harus diisi'
    });
  }

  // Validasi format email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format email tidak valid'
    });
  }

  // Validasi panjang password
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password minimal 8 karakter'
    });
  }

  next();
};

// ======================
//  KONEKSI DATABASE
// ======================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bedhagcoffe',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// ======================
//  INISIALISASI DATABASE
// ======================
const initializeDatabase = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Terhubung ke database MySQL');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'mitra') NOT NULL DEFAULT 'mitra',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    
    console.log('Tabel users siap');
  } catch (err) {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

// ======================
//  ROUTES 
// ======================
app.post('/api/register', validateRegistration, async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Cek duplikasi email
    const [existing] = await connection.query(
    'SELECT id FROM users WHERE LOWER(email) = ?',
    [req.body.email.trim().toLowerCase()] // Konversi ke 
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Simpan ke database
    await connection.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [
        req.body.name.trim(),
        req.body.email.trim().toLowerCase(),
        hashedPassword
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi mitra berhasil!'
    });

  } catch (error) {
    next(error); // Teruskan error ke handler
  } finally {
    if (connection) connection.release();
  }
});


app.use(express.static('public'));
// ======================
//  ERROR HANDLER (DIPINDAHKAN KE BAWAH)
// ======================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan server'
  });
});

// ======================
//  START SERVER
// ======================
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();