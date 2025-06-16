const express = require('express');
const router = express.Router();

// Untuk demo, return dummy data
router.get('/', async (req, res) => {
    const dummyHistory = [
        {
            tanggal_prediksi: "2024-05-01",
            produk: "Arabica",
            prediksi_terjual: 10,
            aktual_terjual: 12,
            akurasi: 83,
            status: "Akurat"
        },
        {
            tanggal_prediksi: "2024-05-08",
            produk: "Robusta",
            prediksi_terjual: 15,
            aktual_terjual: 14,
            akurasi: 93,
            status: "Sangat Akurat"
        }
        // Tambah data lain sesuai kebutuhan
    ];
    res.json(dummyHistory);
});

module.exports = router;
