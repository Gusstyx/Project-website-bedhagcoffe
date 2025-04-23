document.addEventListener("DOMContentLoaded", function () {
    const productForm = document.getElementById('productForm');
    const productTableBody = document.querySelector('#productTable tbody');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const submitBtn = productForm.querySelector('button[type="submit"]');

    let editIndex = -1;

    // Tampilkan produk saat halaman dimuat
    displayProducts();

    // Fokus ke input pertama
    document.getElementById('productName').focus();

    // Tangani submit form
    productForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('productName').value.trim();
        const price = document.getElementById('productPrice').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', displayProducts);

        if (!name || !price || !description) return;

        let products = JSON.parse(localStorage.getItem('products')) || [];
        const product = { name, price, description };

        if (editIndex === -1) {
            // Tambah produk
            products.push(product);
        } else {
            // Update produk
            products[editIndex] = product;
            editIndex = -1;
            submitBtn.textContent = 'Tambah Produk';
            cancelEditBtn.classList.add('d-none');
        }

        localStorage.setItem('products', JSON.stringify(products));
        productForm.reset();
        document.getElementById('productName').focus();
        displayProducts();
    });

    // Tampilkan produk di tabel
    function displayProducts() {
        if (!productTableBody) return;
    
        const searchTerm = searchInput.value.toLowerCase();
        productTableBody.innerHTML = '';
        const products = JSON.parse(localStorage.getItem('products')) || [];
    
        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    
        if (filteredProducts.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Produk tidak ditemukan</td></tr>';
            return;
        }
    
        filteredProducts.forEach((product, index) => {
            const row = `
                <tr>
                    <td>${product.name}</td>
                    <td>Rp ${parseInt(product.price).toLocaleString()}</td>
                    <td>${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="editProduct(${index})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${index})">Hapus</button>
                    </td>
                </tr>
            `;
            productTableBody.insertAdjacentHTML('beforeend', row);
        });
    }
    

    // Hapus produk
    window.deleteProduct = function (index) {
        if (confirm("Yakin ingin menghapus produk ini?")) {
            let products = JSON.parse(localStorage.getItem('products')) || [];
            products.splice(index, 1);
            localStorage.setItem('products', JSON.stringify(products));
            displayProducts();
        }
    };

    // Edit produk
    window.editProduct = function (index) {
        const products = JSON.parse(localStorage.getItem('products')) || [];
        const product = products[index];

        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description;

        editIndex = index;
        submitBtn.textContent = 'Update Produk';
        cancelEditBtn.classList.remove('d-none');
        document.getElementById('productName').focus();
    };

    // Batal edit
    cancelEditBtn.addEventListener('click', function () {
        productForm.reset();
        editIndex = -1;
        submitBtn.textContent = 'Tambah Produk';
        cancelEditBtn.classList.add('d-none');
        document.getElementById('productName').focus();
    });
});
