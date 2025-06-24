const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Authentication Middleware
function authenticateUser(req, res, next) {
    // In a real app, implement proper JWT/session validation here
    // For testing purposes, we'll mock a user
    req.user = { 
        id: 1, 
        role: 'admin', 
        name: 'Admin User' 
    };
    next();
}

// Configure upload directory
const uploadDir = path.join(__dirname, '../public/uploads/dokumen');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx|jpeg|jpg|png|csv|xlsx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only document and image files are allowed'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Error handler for Multer
function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        res.status(400).json({ success: false, error: err.message });
    } else if (err) {
        res.status(400).json({ success: false, error: err.message });
    } else {
        next();
    }
}

// Get all documents
router.get('/', authenticateUser, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        let query = `
            SELECT d.id, d.judul, d.dokumen, d.tanggal_upload, 
                u.name AS pengirim_nama, u.role AS pengirim_role, u.id AS pengirim_id
            FROM dokumen d
            JOIN users u ON d.pengirim_id = u.id
        `;
        const params = [];

        if (req.user.role === 'mitra') {
            query += ' WHERE d.pengirim_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY d.tanggal_upload DESC';
        const [rows] = await connection.query(query, params);

        const data = rows.map((doc) => ({
            ...doc,
            dokumen: `/uploads/dokumen/${path.basename(doc.dokumen)}`,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents' });
    } finally {
        if (connection) connection.release();
    }
});

// Get single document
router.get('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    let connection;

    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            `SELECT d.id, d.judul, d.dokumen AS dokumen,
             d.pengirim_id, d.tanggal_upload, u.name AS pengirim_nama
             FROM dokumen d
             JOIN users u ON d.pengirim_id = u.id
             WHERE d.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Dokumen tidak ditemukan' 
            });
        }

        // Format path dokumen dengan benar
        const dokumenPath = rows[0].dokumen.startsWith('/uploads/') 
            ? rows[0].dokumen 
            : `/uploads/dokumen/${path.basename(rows[0].dokumen)}`;

        res.json({
            success: true,
            data: {
                ...rows[0],
                dokumen: dokumenPath
            }
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal mengambil dokumen' 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Create document
router.post('/', authenticateUser, upload.single('dokumenFile'), handleMulterError, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    const { judul } = req.body;
    const pengirimId = req.user.id;
    const dokumenPath = `/uploads/dokumen/${req.file.filename}`;

    if (!judul) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ 
            success: false, 
            error: 'Title is required' 
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query(
            `INSERT INTO dokumen 
             (judul, dokumen, pengirim_id, tanggal_upload)
             VALUES (?, ?, ?, NOW())`,
            [judul, dokumenPath, pengirimId]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                judul,
                dokumen: dokumenPath,
                tanggal_upload: new Date().toISOString(),
                pengirim_id: pengirimId
            }
        });
    } catch (error) {
        console.error('Error creating document:', error);
        fs.unlink(req.file.path, () => {});
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create document' 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Update document
router.put('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { judul } = req.body;
    const userId = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verify document ownership
        const [doc] = await connection.query(
            'SELECT pengirim_id FROM dokumen WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document not found' 
            });
        }

        if (doc[0].pengirim_id != userId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Unauthorized to update this document' 
            });
        }

        await connection.query(
            'UPDATE dokumen SET judul = ? WHERE id = ?',
            [judul, id]
        );

        res.json({ 
            success: true, 
            message: 'Document updated successfully' 
        });
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update document' 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Delete document
router.delete('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verify document ownership and get file path
        const [doc] = await connection.query(
            'SELECT dokumen, pengirim_id FROM dokumen WHERE id = ?',
            [id]
        );

        if (doc.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document not found' 
            });
        }

        if (doc[0].pengirim_id != userId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Unauthorized to delete this document' 
            });
        }

        // Delete from database
        await connection.query(
            'DELETE FROM dokumen WHERE id = ?',
            [id]
        );

        // Delete physical file
        if (doc[0].dokumen) {
            const filePath = path.join(__dirname, '../public', doc[0].dokumen);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
        }

        res.json({ 
            success: true, 
            message: 'Document deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete document' 
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;