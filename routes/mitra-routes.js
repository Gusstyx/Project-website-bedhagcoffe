// ========================
// FILE: routes/mitra-routes.js
// ========================
const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');


router.get('/me', async (req, res) => {
    console.log("Session:", req.session);

    if (!req.session.userId || req.session.userRole !== 'mitra') {
        return res.status(401).json({ message: 'Unauthorized: Role bukan mitra atau belum login' });
    }

    try {
        const [rows] = await pool.query(
            'SELECT name, email FROM users WHERE id = ? AND role = "mitra"',
            [req.session.userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Data mitra tidak ditemukan' });
        }
        
        // Mengambil data pertama dari hasil query
        const mitra = rows[0];
        res.json({
            name: mitra.name,
            email: mitra.email
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
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