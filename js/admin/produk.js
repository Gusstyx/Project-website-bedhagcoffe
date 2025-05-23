import { openModal, closeModal, initDeleteButtons } from './common.js';

let editingProductId = null;

export function initProductManagement() {
    const addProductBtn = document.getElementById('add-product-btn');
    const productForm = document.getElementById('product-form');

    // Tambah produk
    addProductBtn?.addEventListener('click', () => {
        editingProductId = null;
        document.getElementById('product-modal-title').textContent = 'Tambah Produk';
        productForm.reset();
        openModal('product-modal-backdrop');
    });

    // Edit produk
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productRow = this.closest('tr');
            editingProductId = this.dataset.id;

            document.getElementById('product-id').value = productRow.cells[0].textContent;
            document.getElementById('product-name').value = productRow.cells[1].textContent;
            document.getElementById('product-category').value = productRow.cells[2].textContent.toLowerCase();
            document.getElementById('product-stock').value = parseInt(productRow.cells[3].textContent);
            document.getElementById('product-price').value = parseInt(productRow.cells[4].textContent.replace(/[^0-9]/g, ''));
            document.getElementById('product-status').value = productRow.cells[5].querySelector('.badge').textContent === 'Aktif' ? 'active' : 'inactive';

            document.getElementById('product-modal-title').textContent = 'Edit Produk';
            openModal('product-modal-backdrop');
        });
    });

    // Simpan produk
    document.getElementById('save-product')?.addEventListener('click', function(e) {
        e.preventDefault();
        
        const productData = {
            id: document.getElementById('product-id').value,
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value,
            stock: document.getElementById('product-stock').value,
            price: document.getElementById('product-price').value,
            status: document.getElementById('product-status').value
        };

        if (editingProductId) {
            const productRow = document.querySelector(`.edit-product[data-id="${editingProductId}"]`).closest('tr');
            productRow.cells[1].textContent = productData.name;
            productRow.cells[2].textContent = productData.category.charAt(0).toUpperCase() + productData.category.slice(1);
            productRow.cells[3].textContent = `${productData.stock} kg`;
            productRow.cells[4].textContent = `Rp ${parseInt(productData.price).toLocaleString('id-ID')}`;
            productRow.cells[5].innerHTML = `<span class="badge ${productData.status === 'active' ? 'badge-success' : 'badge-danger'}">${productData.status === 'active' ? 'Aktif' : 'Tidak Aktif'}</span>`;
        } else {
            const newId = `KP${String(document.querySelectorAll('#products-table tbody tr').length + 1).padStart(3, '0')}`;
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${newId}</td>
                <td>${productData.name}</td>
                <td>${productData.category.charAt(0).toUpperCase() + productData.category.slice(1)}</td>
                <td>${productData.stock} kg</td>
                <td>Rp ${parseInt(productData.price).toLocaleString('id-ID')}</td>
                <td><span class="badge ${productData.status === 'active' ? 'badge-success' : 'badge-danger'}">${productData.status === 'active' ? 'Aktif' : 'Tidak Aktif'}</span></td>
                <td class="actions">
                    <button class="btn btn-secondary btn-sm edit-product" data-id="${newId}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-product" data-id="${newId}">Hapus</button>
                </td>
            `;
            document.getElementById('products-table').querySelector('tbody').appendChild(newRow);
        }

        closeModal('product-modal-backdrop');
        initDeleteButtons();
    });
}