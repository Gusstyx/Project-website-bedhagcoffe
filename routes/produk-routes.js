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

        // Ambil seluruh data sales dari database
        const [sales] = await connection.query('SELECT * FROM sales');
        if (!sales || sales.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Database penjualan kosong. Silakan isi/migrasikan data sales terlebih dahulu."
            });
        }

        // Ambil produk_ids dari body, wajib array, minimal 1 produk
        const produk_ids = req.body.produk_ids || [];
        if (!Array.isArray(produk_ids) || produk_ids.length === 0) {
            if (connection) connection.release();
            return res.status(400).json({
                success: false,
                message: "Mohon pilih minimal satu produk untuk prediksi."
            });
        }

        // Filter data sales hanya untuk produk yang dipilih
        const salesTerpilih = sales.filter(s => produk_ids.includes(s.produk_id));

        if (salesTerpilih.length === 0) {
            if (connection) connection.release();
            return res.status(400).json({
                success: false,
                message: "Data penjualan untuk produk yang dipilih tidak ditemukan."
            });
        }

        // Jalankan script Python ARIMA, periode_prediksi selalu 1
        const py = spawn('python', [path.join(__dirname, '../python/arima.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
        py.stdin.write(JSON.stringify({ sales: salesTerpilih, periode_prediksi: 1 }));
        py.stdin.end();

        let result = '';
        py.stdout.on('data', chunk => result += chunk);

        py.on('close', async () => {
            if (!result) {
                if (connection) connection.release();
                return res.status(500).json({ success: false, message: 'Script Python tidak mengembalikan data.' });
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
