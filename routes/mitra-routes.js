// ========================
// FILE: routes/mitra-routes.js
// ========================
const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// Middleware otentikasi sementara (hardcoded untuk testing)
function authenticateMitra(req, res, next) {
    if (!req.session || !req.session.userId || req.session.userRole !== 'mitra') {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Simpan ke req.user agar bisa diakses di route
    req.user = {
        id: req.session.userId,
        role: req.session.userRole,
        email: req.session.email
    };

    next();
    }

// GET data mitra login
// GET data mitra login
// routes/mitra-routes.js
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId || req.session.userRole !== 'mitra') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, name, email, status FROM users WHERE id = ? AND role = "mitra"',
      [id]
    );
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: 'Mitra tidak ditemukan.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    if (connection) connection.release();
  }
});


// GET semua mitra
router.get('/all', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [mitras] = await connection.query(
            'SELECT id, name, email, status FROM users WHERE role = "mitra" AND (status = "pending" OR status = "active")'
        );
        res.json(mitras);
    } catch (error) {
        res.status(500).json([]);
    } finally {
        if (connection) connection.release();
    }
});

// SETUJUI MITRA
router.post('/approve/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('UPDATE users SET status = ? WHERE id = ?', ['active', id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        if (connection) connection.release();
    }
});

// HAPUS MITRA
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Akun mitra berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menghapus akun mitra.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;