// Global variables
let currentUser = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // 1. Ambil data dari localStorage
    const userData = localStorage.getItem('user');
    
    // 2. Jika data ada, masukkan ke variabel global currentUser
    if (userData) {
        currentUser = JSON.parse(userData);
        console.log("User terdeteksi:", currentUser); // Untuk debugging
        
        // Update tampilan nama di navbar jika elemennya ada
        const userNameElem = document.getElementById('userName');
        if (userNameElem) {
            userNameElem.textContent = currentUser.nama;
        }
        
        // Load data marketplace
        loadAllData();
        
        // Inisialisasi navigasi hanya jika fungsi ini ada
        if (typeof setupNavigation === 'function') {
            setupNavigation();
        }
    } else {
        // 3. Jika TIDAK ada data user dan Anda mencoba akses menu.html, tendang ke login
        if (window.location.pathname.includes('menu.html')) {
            alert('Sesi habis, silakan login kembali');
            window.location.href = '/login.html'; // Sesuaikan dengan nama file login Anda
        }
    }
});

// Contoh fungsi login yang seharusnya Anda miliki
async function handleLogin(username, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // SIMPAN DATA KE LOCALSTORAGE AGAR SCRIPT.JS BISA MEMBACANYA
            // result.user biasanya berisi { id, nama, role, dll } dari database
            localStorage.setItem('user', JSON.stringify(result.user)); 
            window.location.href = 'menu.html';
        } else {
            alert('Login gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Scroll to section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Update active link on scroll
    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// Fungsi untuk memicu pencarian
function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    loadProducts(keyword); // Panggil fungsi load dengan kata kunci
}

// Tambahkan event listener untuk tombol "Enter" pada input
document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Load all data
async function loadAllData() {
    await loadProducts();
    await loadCart();
    await loadTransactions();
}

// Load products
// Load products (DIPERBAIKI agar mendukung Search)
async function loadProducts(search = '') {
    try {
        // Jika ada parameter search, tambahkan ke URL
        const url = search ? `/products?search=${encodeURIComponent(search)}` : '/products';
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        // Simpan data ke variabel global agar bisa diakses displayProducts
        products = await response.json();
        
        // Panggil fungsi display lama Anda (CSS tetap terjaga)
        displayProducts();
        
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Gagal memuat produk');
    }
}

// Fungsi bantu untuk tombol "Cari" di HTML
function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    loadProducts(keyword);
}

// Display products
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <i class="fas fa-${getProductIcon(product.kategori)}"></i>
            </div>
            <div class="product-info">
                <span class="product-category">${product.kategori.toUpperCase()}</span>
                <h3 class="product-name">${product.nama}</h3>
                <div class="product-price">Rp ${product.harga.toLocaleString('id-ID')}</div>
                <div class="product-stock">Stok: ${product.stok} | Penjual: ${product.penjual}</div>
                <p class="product-description">${product.deskripsi || 'Tidak ada deskripsi'}</p>
                <div class="product-actions">
                    <button class="btn-add-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Keranjang
                    </button>
                    <button class="btn-buy" onclick="buyNow(${product.id})">
                        <i class="fas fa-shopping-bag"></i> Beli
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Get product icon based on category
function getProductIcon(category) {
    const icons = {
        'plastik': 'wine-bottle',
        'kertas': 'file-alt',
        'logam': 'cog',
        'kaca': 'glass-whiskey',
        'elektronik': 'laptop',
        'lainnya': 'recycle'
    };
    return icons[category] || 'recycle';
}

// Load cart
async function loadCart() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/cart/${currentUser.id}`);
        cartItems = await response.json();
        displayCart();
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Display cart
function displayCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p class="empty-cart">Keranjang belanja kosong</p>';
        return;
    }
    
    let total = 0;
    container.innerHTML = cartItems.map(item => {
        const itemTotal = item.harga * item.jumlah;
        total += itemTotal;
        
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-${getProductIcon(item.kategori)}"></i>
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.nama}</h4>
                    <div class="cart-item-price">Rp ${item.harga.toLocaleString('id-ID')}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.jumlah - 1})">-</button>
                        <span>${item.jumlah}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.jumlah + 1})">+</button>
                    </div>
                </div>
                <div class="cart-item-total">
                    Rp ${itemTotal.toLocaleString('id-ID')}
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    container.innerHTML += `
        <div class="cart-total">
            Total: Rp ${total.toLocaleString('id-ID')}
        </div>
    `;
}

// Add to cart
async function addToCart(productId) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu');
        return;
    }
    
    try {
        const response = await fetch('/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                product_id: productId,
                jumlah: 1
            })
        });
        
        const result = await response.json(); // Baca body respon
        
        if (response.ok && result.success) {
            alert('Produk berhasil ditambahkan ke keranjang');
            loadCart(); // Refresh tampilan keranjang
        } else {
            // Jika server mengirim error (misal status 500 atau 400)
            alert('Gagal menambahkan ke keranjang: ' + (result.message || 'Error tidak diketahui'));
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Gagal menghubungi server');
    }
}

// Update quantity
async function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(cartId);
        return;
    }
    
    try {
        const response = await fetch(`/cart/${cartId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jumlah: newQuantity })
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
    }
}

// Remove from cart
async function removeFromCart(cartId) {
    if (!confirm('Hapus produk dari keranjang?')) return;
    
    try {
        const response = await fetch(`/cart/${cartId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Gagal menghapus dari keranjang');
    }
}

// Clear cart
async function clearCart() {
    if (cartItems.length === 0 || !confirm('Kosongkan seluruh keranjang?')) return;
    
    try {
        for (const item of cartItems) {
            await fetch(`/cart/${item.id}`, { method: 'DELETE' });
        }
        loadCart();
    } catch (error) {
        console.error('Error clearing cart:', error);
    }
}

// Checkout
async function checkout() {
    if (cartItems.length === 0) {
        alert('Keranjang belanja kosong');
        return;
    }
    
    if (!confirm('Proses checkout?')) return;
    
    try {
        for (const item of cartItems) {
            const total = item.harga * item.jumlah;
            await fetch('/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: item.product_id,
                    jumlah: item.jumlah,
                    total_harga: total
                })
            });
        }
        
        alert('Checkout berhasil!');
        loadCart();
        loadTransactions();
    } catch (error) {
        console.error('Error during checkout:', error);
        alert('Gagal checkout');
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch('/transactions');
        transactions = await response.json();
        displayTransactions();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Display transactions
function displayTransactions() {
    const tbody = document.getElementById('transactionsBody');
    if (!tbody) return;
    
    tbody.innerHTML = transactions.map(transaction => `
        <tr>
            <td>${transaction.id}</td>
            <td>${transaction.nama_produk}</td>
            <td>${transaction.nama_user}</td>
            <td>${transaction.jumlah}</td>
            <td>Rp ${transaction.total_harga.toLocaleString('id-ID')}</td>
            <td>${new Date(transaction.tanggal_transaksi).toLocaleDateString('id-ID')}</td>
            <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
        </tr>
    `).join('');
}

// Add product form handler
if (document.getElementById('addProductForm')) {
    document.getElementById('addProductForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Silakan login terlebih dahulu');
            return;
        }
        
        const formData = new FormData();
        formData.append('user_id', currentUser.id);
        formData.append('nama', document.getElementById('nama').value);
        formData.append('kategori', document.getElementById('kategori').value);
        formData.append('harga', document.getElementById('harga').value);
        formData.append('stok', document.getElementById('stok').value);
        formData.append('deskripsi', document.getElementById('deskripsi').value);
        
        const gambarInput = document.getElementById('gambar');
        if (gambarInput.files[0]) {
            formData.append('gambar', gambarInput.files[0]);
        }
        
        try {
            const response = await fetch('/products', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Produk berhasil ditambahkan');
                this.reset();
                loadProducts();
            } else {
                alert('Gagal menambahkan produk');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Gagal menambahkan produk');
        }
    });
}

// Report download functions
function downloadPDF() {
    window.open('/report/pdf', '_blank');
}

function downloadCSV() {
    window.open('/report/csv', '_blank');
}

function downloadExcel() {
    window.open('/report/excel', '_blank');
}

// Buy now function
function buyNow(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    if (!currentUser) {
        alert('Silakan login terlebih dahulu');
        return;
    }
    
    const quantity = prompt(`Masukkan jumlah ${product.nama} yang ingin dibeli:`, '1');
    if (!quantity || isNaN(quantity) || quantity < 1) return;
    
    if (parseInt(quantity) > product.stok) {
        alert('Stok tidak mencukupi');
        return;
    }
    
    const total = product.harga * quantity;
    
    if (confirm(`Beli ${quantity} ${product.nama} seharga Rp ${total.toLocaleString('id-ID')}?`)) {
        fetch('/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                product_id: productId,
                jumlah: parseInt(quantity),
                total_harga: total
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Pembelian berhasil!');
                loadProducts();
                loadTransactions();
            }
        })
        .catch(error => {
            console.error('Error buying product:', error);
            alert('Gagal melakukan pembelian');
        });
    }
}

// Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Create uploads directory if not exists
async function checkUploadsDir() {
    // This would be handled by the server-side code
    // In a real application, ensure the uploads directory exists
    console.log('Ensure public/uploads directory exists');
}