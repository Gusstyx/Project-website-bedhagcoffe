const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Multer setup
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

// GET Semua Produk
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

// GET Produk by ID
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

// POST Tambah Produk
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

// PUT Edit Produk
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { stok_awal, stok_terjual } = req.body; // Hanya terima stok
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Hanya update stok_awal dan stok_terjual
        const [result] = await connection.query(
            'UPDATE sales SET stok_awal=?, stok_terjual=? WHERE id=?',
            [stok_awal, stok_terjual, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Data tidak ditemukan' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Data berhasil diperbarui' 
        });
        
    } catch (e) {
        res.status(500).json({ 
            success: false, 
            message: e.message 
        });
    } finally {
        if (connection) connection.release();
    }
});


// DELETE Produk
router.delete('/:id', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [produk] = await connection.query('SELECT gambar FROM produk WHERE id = ?', [req.params.id]);
        if (produk.length && produk[0].gambar && produk[0].gambar.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '../public', produk[0].gambar);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await connection.query('DELETE FROM produk WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: "Produk berhasil dihapus" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
