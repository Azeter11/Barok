const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const PDFDocument = require('pdfkit');
const fastcsv = require('fast-csv');
const ExcelJS = require('exceljs');
const multer = require('multer');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));



// Database connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Sesuaikan dengan password MySQL Anda
    database: 'daurulang_new1'
};

// Deklarasikan variabel db di scope global (paling atas)
let db;

async function connectToDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Berhasil terhubung ke database MySQL');
        
        // Penanganan jika koneksi terputus tiba-tiba
        db.on('error', (err) => {
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('Koneksi terputus, mencoba hubungkan kembali...');
                connectToDatabase();
            } else {
                throw err;
            }
        });
    } catch (err) {
        console.error('Gagal terhubung ke database:', err.message);
        // Coba hubungkan kembali setelah 5 detik jika gagal
        setTimeout(connectToDatabase, 5000);
    }
}

// Jalankan fungsi koneksi
connectToDatabase();

// Fungsi pembantu untuk mengambil koneksi (agar tidak "not defined")
async function getConnection() {
    if (!db) {
        // Jika db belum ada, tunggu inisialisasi ulang
        db = await mysql.createConnection(dbConfig);
    }
    return db;
}

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Helper function for database connection
async function getConnection() {
    return await mysql.createConnection(dbConfig);
}

// ==================== ROUTES ====================

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==================== REGISTER ====================
app.post('/register', async (req, res) => {
    const { username, password, nama, email, telepon, alamat } = req.body;
    
    // Validasi input
    if (!username || !password || !nama || !email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Semua field wajib diisi' 
        });
    }
    
    try {
        const connection = await getConnection();
        
        // Check if username already exists
        const [existingUsername] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsername.length > 0) {
            await connection.end();
            return res.status(400).json({ 
                success: false, 
                message: 'Username sudah digunakan' 
            });
        }
        
        // Check if email already exists
        const [existingEmail] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            await connection.end();
            return res.status(400).json({ 
                success: false, 
                message: 'Email sudah terdaftar' 
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert new user
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, nama, email, nomor_hp, alamat) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, nama, email, telepon || null, alamat || null]
        );
        
        await connection.end();
        
        res.json({ 
            success: true, 
            message: 'Registrasi berhasil! Silakan login.',
            userId: result.insertId 
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// ==================== LOGIN (DIPERBAIKI) ====================
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Validasi input
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username dan password harus diisi' 
        });
    }
    
    try {
        const connection = await getConnection();
        
        // Get user with hashed password
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        await connection.end();
        
        if (rows.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Username tidak ditemukan' 
            });
        }
        
        const user = rows[0];
        
        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.json({ 
                success: false, 
                message: 'Password salah' 
            });
        }
        
        // Login successful
        res.json({ 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                nama: user.nama,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// ==================== API PRODUK (CRUD) ====================

// Ganti /api/products menjadi /products agar sesuai dengan script.js
app.get('/products', async (req, res) => {
    try {
        const connection = await getConnection();
        // Tambahkan JOIN ke users agar kolom 'penjual' di marketplace tidak kosong
        const [rows] = await connection.execute(`
            SELECT p.*, u.nama as penjual 
            FROM products p 
            LEFT JOIN users u ON p.user_id = u.id 
            ORDER BY p.id DESC
        `);
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data' });
    }
});

// POST: Tambah produk baru
// Ubah /api/products menjadi /products agar sinkron dengan script.js
app.post('/products', upload.single('gambar'), async (req, res) => {
    const { user_id, nama, kategori, harga, stok, deskripsi } = req.body;
    const gambar = req.file ? req.file.filename : null;
    
    // Tambahkan validasi sederhana
    if (!user_id) {
        return res.status(401).json({ success: false, message: 'User ID tidak ditemukan' });
    }

    try {
        const connection = await getConnection();
        await connection.execute(
            'INSERT INTO products (user_id, nama, kategori, harga, stok, deskripsi, gambar) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, nama, kategori, harga, stok, deskripsi, gambar]
        );
        // Pastikan tidak menutup koneksi jika menggunakan pool, 
        // tapi jika menggunakan getConnection biasa seperti kode Anda:
        await connection.end(); 
        
        res.json({ success: true, message: 'Produk berhasil ditambahkan' });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: 'Gagal menambah produk' });
    }
});

// PUT: Update produk
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { nama, kategori, harga, stok, deskripsi } = req.body;
    try {
        const connection = await getConnection();
        await connection.execute(
            'UPDATE products SET nama=?, kategori=?, harga=?, stok=?, deskripsi=? WHERE id=?',
            [nama, kategori, harga, stok, deskripsi, id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Gagal update produk' });
    }
});

// DELETE: Hapus produk
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getConnection();
        await connection.execute('DELETE FROM products WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus produk' });
    }
});


// ==================== CHECK USERNAME AVAILABILITY ====================
app.get('/check-username/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        await connection.end();
        
        res.json({ 
            available: rows.length === 0 
        });
        
    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({ 
            available: false,
            error: 'Server error' 
        });
    }
});

// GET: Ambil isi keranjang berdasarkan user_id
app.get('/cart/:user_id', async (req, res) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(`
            SELECT c.*, p.nama, p.harga, p.kategori 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?`, 
            [req.params.user_id]
        );
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Gagal memuat keranjang' });
    }
});

// POST: Tambah ke keranjang
app.post('/cart', async (req, res) => {
    const { user_id, product_id, jumlah } = req.body;

    // Validasi input
    if (!user_id || !product_id || !jumlah) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    try {
        const connection = await getConnection();
        
        // Cek apakah produk sudah ada di keranjang user tersebut
        const [existing] = await connection.execute(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existing.length > 0) {
            // Jika sudah ada, update jumlahnya
            await connection.execute(
                'UPDATE cart SET jumlah = jumlah + ? WHERE user_id = ? AND product_id = ?',
                [jumlah, user_id, product_id]
            );
        } else {
            // Jika belum ada, insert baru
            await connection.execute(
                'INSERT INTO cart (user_id, product_id, jumlah) VALUES (?, ?, ?)',
                [user_id, product_id, jumlah]
            );
        }

        await connection.end();
        res.json({ success: true, message: 'Berhasil ditambahkan ke keranjang' });
    } catch (error) {
        console.error('Cart Error:', error);
        res.status(500).json({ success: false, message: 'Gagal ke database' });
    }
});

// DELETE: Hapus item keranjang
app.delete('/cart/:id', async (req, res) => {
    try {
        const connection = await getConnection();
        await connection.execute('DELETE FROM cart WHERE id = ?', [req.params.id]);
        await connection.end();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Riwayat Transaksi (Untuk Tampilan Laporan)
app.get('/transactions', async (req, res) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(`
            SELECT t.*, p.nama as nama_produk, u.nama as nama_user 
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN users u ON t.user_id = u.id
            ORDER BY t.tanggal_transaksi DESC
        `);
        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Gagal memuat transaksi' });
    }
});

// POST: Catat Transaksi Baru
app.post('/transactions', async (req, res) => {
    const { user_id, product_id, jumlah, total_harga } = req.body;
    try {
        const connection = await getConnection();
        // 1. Masukkan ke tabel transaksi
        await connection.execute(
            'INSERT INTO transactions (user_id, product_id, jumlah, total_harga, status) VALUES (?, ?, ?, ?, ?)',
            [user_id, product_id, jumlah, total_harga, 'pending']
        );
        // 2. Kurangi stok produk
        await connection.execute(
            'UPDATE products SET stok = stok - ? WHERE id = ?',
            [jumlah, product_id]
        );
        await connection.end();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== CHECK EMAIL AVAILABILITY ====================
app.get('/check-email/:email', async (req, res) => {
    const { email } = req.params;
    
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        await connection.end();
        
        res.json({ 
            available: rows.length === 0 
        });
        
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ 
            available: false,
            error: 'Server error' 
        });
    }
});

// ... (kode lainnya tetap sama seperti sebelumnya) ...

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});