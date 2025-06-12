const express = require('express');
const router = express.Router();
const pool = require('../db/mysql'); // Pastikan path sudah benar

// GET semua mitra (status pending & active, hanya role mitra)
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

// APPROVE MITRA BY ID
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

// DELETE MITRA BY ID (Tolak & hapus mitra)
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
