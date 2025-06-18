// prediksi-routes.js (Versi Dibenerin untuk Tidak Menampilkan Output Python di Terminal)
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const pool = require('../db/mysql');
const path = require('path');

// POST /api/prediksi/proses
router.post('/proses', async (req, res) => {
    let connection;
    let pyStderrResult = ''; // Variabel untuk menangkap output stderr dari Python

    try {
        connection = await pool.getConnection();
        const produk_ids = req.body.produk_ids || [];
        const periode_prediksi = req.body.periode_prediksi || 4; // Default 4 minggu

        // Query berdasarkan produk yang dipilih
        let sales;
        if (produk_ids.length > 0) {
            [sales] = await connection.query(
                'SELECT * FROM sales WHERE produk_id IN (?) ORDER BY tanggal_minggu ASC', // Pastikan terurut
                [produk_ids]
            );
        } else {
            return res.status(400).json({
                success: false,
                message: "Pilih produk untuk memulai prediksi."
            });
        }

        if (!sales || sales.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Database penjualan kosong untuk produk yang dipilih atau data kurang. Silakan isi/migrasikan data sales terlebih dahulu."
            });
        }

        // Jalankan script Python
        const py = spawn('python', [path.join(__dirname, '../python/arima.py')], {
            stdio: ['pipe', 'pipe', 'pipe'] // Perubahan utama: 'inherit' diubah menjadi 'pipe' untuk stderr
        });

        py.stdin.write(JSON.stringify({
            sales,
            periode_prediksi
        }));
        py.stdin.end();

        let result = '';
        py.stdout.on('data', chunk => {
            result += chunk;
        });

        // Menangkap output stderr dari Python
        py.stderr.on('data', (data) => {
            pyStderrResult += data.toString();
        });

        py.on('close', async (code) => {
            if (code !== 0) { // Periksa kode keluar Python
                // Log stderr dan stdout ke konsol server Node.js untuk debugging internal
                console.error(`Python script exited with code ${code}.`);
                console.error(`Python stdout (partial/error): ${result}`);
                console.error(`Python stderr: ${pyStderrResult}`);

                res.status(500).json({
                    success: false,
                    message: 'Script Python berakhir dengan error. Cek konsol server untuk detail.'
                });
                if (connection) connection.release();
                return;
            }

            if (!result) {
                // Log stderr ke konsol server Node.js meskipun stdout kosong
                console.error("Python script did not return any data (stdout empty).");
                console.error(`Python stderr: ${pyStderrResult}`);

                res.status(500).json({
                    success: false,
                    message: 'Script Python tidak mengembalikan data.'
                });
                if (connection) connection.release();
                return;
            }

            try {
                const prediksi = JSON.parse(result);

                // Pastikan semua produk memiliki hasil yang valid
                const validResults = prediksi.map(p => ({
                    ...p,
                    hasil_prediksi: p.hasil_prediksi || [],
                    histori: p.histori || []
                }));

                res.json({
                    success: true,
                    prediksi: validResults
                });
            } catch (e) {
                // Log stderr ke konsol server Node.js jika parsing JSON gagal
                console.error('Failed to parse Python script output:', e.message);
                console.error('Raw Python stdout:', result);
                console.error('Raw Python stderr:', pyStderrResult);

                res.status(500).json({
                    success: false,
                    message: 'Prediksi gagal: ' + e.message,
                    detail: pyStderrResult // Opsional: kirimkan stderr ke frontend untuk debugging, hapus di produksi
                });
            } finally {
                if (connection) connection.release();
            }
        });

        py.on('error', (e) => {
            console.error('Failed to spawn python script:', e.message);
            console.error(`Python stderr captured during spawn error: ${pyStderrResult}`);
            res.status(500).json({
                success: false,
                message: 'Gagal menjalankan python script: ' + e.message
            });
            if (connection) connection.release();
        });

    } catch (e) {
        if (connection) connection.release();
        console.error('Error in /api/prediksi/proses route (Node.js caught):', e.message);
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
        console.error('Error fetching prediction history:', e.message);
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
        console.error('Error fetching product list for prediction dropdown:', e.message);
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
        console.error(`Error updating prediction ID ${id}:`, e.message);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});



module.exports = router;