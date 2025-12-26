document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('user'));
    
    // Proteksi: Jika bukan admin, tendang ke login
    if (!userData || userData.role !== 'admin') {
        alert('Akses khusus admin!');
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('adminName').textContent = userData.nama_lengkap || userData.username;

    loadStats();
    setupNavigation();
});

function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.admin-section');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('onclick')) return; // Abaikan logout
            e.preventDefault();

            // Hapus class active dan sembunyikan semua section
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');

            // Aktifkan link dan section yang dipilih
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).style.display = 'block';

            // Load data otomatis
            if (targetId === 'manage-products') loadAllProductsAdmin();
            if (targetId === 'manage-transactions') loadAllTransactionsAdmin();
        });
    });
}

async function loadStats() {
    const pRes = await fetch('/products');
    const tRes = await fetch('/transactions');
    const prods = await pRes.json();
    const trans = await tRes.json();
    
    document.getElementById('total-products').textContent = prods.length;
    document.getElementById('total-transactions').textContent = trans.length;
}

async function loadAllProductsAdmin() {
    const res = await fetch('/products');
    const products = await res.json();
    const tbody = document.getElementById('adminProductsBody');
    
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="/uploads/${p.gambar || 'default.jpg'}" alt="img"></td>
            <td>${p.nama}</td>
            <td>${p.penjual || 'User'}</td>
            <td>${p.kategori}</td>
            <td>Rp ${parseFloat(p.harga).toLocaleString()}</td>
            <td>${p.stok}</td>
            <td>
                <button class="btn-action btn-delete" onclick="deleteProduct(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteProduct(id) {
    if (!confirm('Hapus produk ini?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) loadAllProductsAdmin();
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}