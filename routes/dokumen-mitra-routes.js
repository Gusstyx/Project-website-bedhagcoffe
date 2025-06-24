const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Direktori simpan file mitra
const uploadDir = path.join(__dirname, '../public/uploads/dokumen_mitra');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /pdf|docx?|png|jpg|jpeg|xlsx|csv/;
        const validExt = allowed.test(path.extname(file.originalname).toLowerCase());
        const validMime = allowed.test(file.mimetype);
        if (validExt && validMime) return cb(null, true);
        cb(new Error('File tidak valid'));
    }
});

// Middleware autentikasi user mitra
function authenticateMitra(req, res, next) {
    const user = req.session?.user; // Sesuaikan dengan cara simpan session kamu
    if (!user || user.role !== 'mitra') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = user;
    next();
}

// Upload dokumen mitra
router.post('/upload', authenticateMitra, upload.single('dokumenFile'), async (req, res) => {
    const pengirimId = req.user.id;
    const dokumenId = req.body.dokumen_id;
    const filePath = `/uploads/dokumen_mitra/${req.file.filename}`;

    if (!dokumenId || !req.file) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Simpan ke tabel dokumen_mitra
        await connection.query(`
            INSERT INTO dokumen_mitra (dokumen_id, pengirim_id, file_path, tanggal_upload)
            VALUES (?, ?, ?, NOW())
        `, [dokumenId, pengirimId, filePath]);

        res.status(201).json({ success: true, message: 'Dokumen berhasil diunggah' });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).json({ success: false, message: 'Gagal menyimpan dokumen' });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/test', (req, res) => {
  console.log('>>> route test mitra-dokumen aktif');
  res.json({ success: true, message: 'Route mitra-dokumen OK' });
});


module.exports = router;
