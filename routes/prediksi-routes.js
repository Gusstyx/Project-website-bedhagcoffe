const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const pool = require('../db/mysql');
const path = require('path');

// POST /api/prediksi/proses
router.post('/proses', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const produk_ids = req.body.produk_ids || []; // Ambil produk yang dipilih
        let query = 'SELECT * FROM sales';
        let params = [];
        if (produk_ids.length > 0) {
            query += ' WHERE produk_id IN (?)';
            params = [produk_ids];
        }
        const [sales] = await connection.query('SELECT * FROM sales');
        if (!sales || sales.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Database penjualan kosong. Silakan isi/migrasikan data sales terlebih dahulu."
            });
        }

        // Ambil parameter periode_prediksi dari body request (default 1)
        const periode_prediksi = req.body.periode_prediksi || 1;

        // Jalankan script Python ARIMA dan kirim sales + periode_prediksi
        const py = spawn('python', [path.join(__dirname, '../python/arima.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
        py.stdin.write(JSON.stringify({ sales, periode_prediksi }));
        py.stdin.end();

        let result = '';
        py.stdout.on('data', chunk => result += chunk);

        py.on('close', async () => {
            if (!result) {
                res.status(500).json({ success: false, message: 'Script Python tidak mengembalikan data.' });
                if (connection) connection.release();
                return;
            }
            try {
                console.log('Output Python:', result);
                const prediksi = JSON.parse(result);
                res.json({ success: true, prediksi });
            } catch (e) {
                res.status(500).json({ success: false, message: 'Prediksi gagal: ' + e.message, detail: result });
            } finally {
                if (connection) connection.release();
            }
        });

        py.on('error', (e) => {
            res.status(500).json({ success: false, message: 'Gagal menjalankan python script: ' + e.message });
            if (connection) connection.release();
        });

    } catch (e) {
        if (connection) connection.release();
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/prediksi?minggu_dari=YYYY-MM-DD&minggu_sampai=YYYY-MM-DD
router.get('/', async (req, res) => {
    const { minggu_dari, minggu_sampai } = req.query;
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            `SELECT p.*, pr.nama as nama_produk 
             FROM prediksi p 
             JOIN produk pr ON pr.id = p.produk_id 
             WHERE p.tanggal_minggu_prediksi BETWEEN ? AND ? 
             ORDER BY p.tanggal_minggu_prediksi ASC`, 
            [minggu_dari, minggu_sampai]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json([]);
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/prediksi/produk
router.get('/produk', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [produk] = await connection.query('SELECT id, nama FROM produk');
        res.json(produk);
    } catch (e) {
        res.status(500).json({ message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /api/prediksi/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        jumlah_prediksi,
        safety_stock,
        rekomendasi_restock,
        stok_akhir_terakhir,
        rekomendasi_pembelian,
        peringatan,
        tanggal_minggu_prediksi
    } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query(
            `UPDATE prediksi SET 
                jumlah_prediksi = ?, 
                safety_stock = ?,
                rekomendasi_restock = ?,
                stok_akhir_terakhir = ?,
                rekomendasi_pembelian = ?,
                peringatan = ?,
                tanggal_minggu_prediksi = ?
            WHERE id = ?`,
            [
                jumlah_prediksi,
                safety_stock,
                rekomendasi_restock,
                stok_akhir_terakhir,
                rekomendasi_pembelian,
                peringatan,
                tanggal_minggu_prediksi,
                id
            ]
        );
        res.json({ success: true, message: 'Data prediksi berhasil diupdate.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
