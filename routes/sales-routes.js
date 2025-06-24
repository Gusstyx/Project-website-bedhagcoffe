
const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// ================ TAMBAH PENJUALAN ================
router.post('/', async (req, res) => {
    const sales = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        for (const sale of sales) {
            // Validasi dan cek duplikat...
            const [exist] = await connection.query(
                'SELECT id FROM sales WHERE produk_id=? AND tanggal_minggu=?',
                [sale.produk_id, sale.tanggal_minggu]
            );
            if (exist.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Data penjualan produk ini pada minggu ${sale.tanggal_minggu} sudah ada!`
                });
            }
            await connection.query(
                'INSERT INTO sales (produk_id, tanggal_minggu, stok_awal, stok_terjual) VALUES (?, ?, ?, ?)',
                [sale.produk_id, sale.tanggal_minggu, sale.stok_awal, sale.stok_terjual]
            );
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (connection) connection.release();
    }
});


// ================ AMBIL SEMUA DATA PENJUALAN ================
// GET /api/sales
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            `SELECT s.id, s.produk_id, p.nama as produk_nama, s.tanggal_minggu, s.stok_awal, s.stok_terjual
            FROM sales s JOIN produk p ON s.produk_id = p.id
            ORDER BY s.tanggal_minggu DESC, s.id DESC`
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================ CEK DUPLIKAT PENJUALAN ================
// GET /api/sales/check?produk_id=...&tanggal_minggu=...
router.get('/check', async (req, res) => {
    const { produk_id, tanggal_minggu } = req.query;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT id FROM sales WHERE produk_id=? AND tanggal_minggu=?',
            [produk_id, tanggal_minggu]
        );
        res.json({ exist: rows.length > 0 });
    } catch (e) {
        res.json({ exist: false });
    } finally {
        if (connection) connection.release();
    }
});

// ================ UPDATE DATA PENJUALAN ================
// PUT /api/sales/:id
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { produk_id, tanggal_minggu, stok_awal, stok_terjual } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        const [exist] = await connection.query(
            'SELECT id FROM sales WHERE produk_id=? AND tanggal_minggu=? AND id <> ?',
            [produk_id, tanggal_minggu, id]
        );
        if (exist.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Data penjualan produk ini pada minggu ${tanggal_minggu} sudah ada!`
            });
        }
        const [result] = await connection.query(
            'UPDATE sales SET produk_id=?, tanggal_minggu=?, stok_awal=?, stok_terjual=? WHERE id=?',
            [produk_id, tanggal_minggu, stok_awal, stok_terjual, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil diperbarui' });
    } catch (e) {
        // --- TAMBAHAN: LOG ERROR LEBIH DETAIL KE KONSOL SERVER ---
        console.error('Error saat memperbarui data penjualan:', e); 
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================ HAPUS DATA PENJUALAN ================
// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query('DELETE FROM sales WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (connection) connection.release();
    }
});


module.exports = router;
