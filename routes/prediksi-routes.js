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
        // Ambil semua data sales dari DB
        const [sales] = await connection.query('SELECT * FROM sales');
        // Gunakan path absolut agar tidak error
        const py = spawn('python', [path.join(__dirname, '../python/arima.py')], { stdio: ['pipe', 'pipe', 'inherit'] });

        py.stdin.write(JSON.stringify(sales));
        py.stdin.end();

        let result = '';
        py.stdout.on('data', chunk => result += chunk);

        py.on('close', async () => {
            try {
                const prediksi = JSON.parse(result);
                await Promise.all(prediksi.map(p =>
                    connection.query(
                        'INSERT INTO prediksi (produk_id, tanggal_minggu_prediksi, jumlah_prediksi, tanggal_prediksi) VALUES (?, ?, ?, CURDATE())',
                        [p.produk_id, p.tanggal_minggu_prediksi, p.jumlah_prediksi]
                    )
                ));
                res.json({ success: true, prediksi });
            } catch (e) {
                res.status(500).json({ success: false, message: 'Prediksi gagal: ' + e.message });
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
})

module.exports = router;
