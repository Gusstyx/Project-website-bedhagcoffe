const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// AMBIL SEMUA DOKUMEN
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT * FROM dokumen ORDER BY tanggal_upload DESC'
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// TAMBAH DOKUMEN
router.post('/', async (req, res) => {
    const { judul, deskripsi, url } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO dokumen (judul, deskripsi, url, tanggal_upload) VALUES (?, ?, ?, NOW())',
            [judul, deskripsi, url]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
