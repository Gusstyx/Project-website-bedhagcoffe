const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// === Multer setup ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage });

// ================== GET Semua Produk ==================
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [produk] = await connection.query('SELECT * FROM produk');
        res.json(produk);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== GET Produk By ID ==================
router.get('/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [produk] = await connection.query('SELECT * FROM produk WHERE id = ?', [req.params.id]);
        if (!produk.length) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
        res.json(produk[0]);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== POST Tambah Produk ==================
router.post('/', upload.single('gambar'), async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { nama, harga, deskripsi } = req.body;
        let gambar = null;
        if (req.file) {
            gambar = '/uploads/' + req.file.filename;
        }
        await connection.query(
            'INSERT INTO produk (nama, harga, deskripsi, gambar) VALUES (?, ?, ?, ?)',
            [nama, harga, deskripsi, gambar]
        );
        res.json({ success: true, message: "Produk berhasil ditambah" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== PUT Edit Produk ==================
router.put('/:id', upload.single('gambar'), async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { nama, harga, deskripsi, oldGambar } = req.body;
        let gambar = oldGambar || null;
        if (req.file) {
            gambar = '/uploads/' + req.file.filename;
            // Hapus gambar lama jika ada
            if (oldGambar && oldGambar.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '../public', oldGambar);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }
        await connection.query(
            'UPDATE produk SET nama=?, harga=?, deskripsi=?, gambar=? WHERE id=?',
            [nama, harga, deskripsi, gambar, req.params.id]
        );
        res.json({ success: true, message: "Produk berhasil diupdate" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================== DELETE Produk ==================
router.delete('/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        // Hapus file gambar juga
        const [produk] = await connection.query('SELECT gambar FROM produk WHERE id = ?', [req.params.id]);
        if (produk.length && produk[0].gambar && produk[0].gambar.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '../public', produk[0].gambar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await connection.query('DELETE FROM produk WHERE id=?', [req.params.id]);
        res.json({ success: true, message: "Produk berhasil dihapus" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});


module.exports = router;
