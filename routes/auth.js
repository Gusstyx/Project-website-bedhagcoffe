const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/mysql'); // Pastikan path DB sudah benar

// REGISTER
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
        return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [existing] = await connection.query(
            'SELECT id FROM users WHERE LOWER(email) = ?',
            [email.trim().toLowerCase()]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // JIKA ADMIN, STATUS LANGSUNG ACTIVE!
        const userRole = role === 'admin' ? 'admin' : 'mitra';
        const status = userRole === 'admin' ? 'active' : 'pending';

        await connection.query(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, userRole, status]
        );
        res.status(201).json({ success: true, message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    } finally {
        if (connection) connection.release();
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim()) {
        return res.status(400).json({ success: false, message: 'Email dan password harus diisi' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        const user = users[0];
        // CEK STATUS
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Akun Anda masih menunggu persetujuan admin. Silakan cek kembali dalam 1-2 jam.'
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.email = user.email;
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
            success: true,
            message: 'Login berhasil',
            data: { ...userWithoutPassword, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
