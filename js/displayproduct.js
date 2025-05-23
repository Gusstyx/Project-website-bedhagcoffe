document.addEventListener("DOMContentLoaded", function () {
    const menuContainer = document.getElementById('menu-container');
    const products = JSON.parse(localStorage.getItem('products')) || [];

    if (!menuContainer) return;

    if (products.length === 0) {
        menuContainer.innerHTML = '<p class="text-center">Belum ada produk tersedia</p>';
        return;
    }

    let html = '<div class="row">';
    products.forEach((product, index) => {
        html += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text">${product.description}</p>
                        <p class="price">Rp ${parseInt(product.price).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    menuContainer.innerHTML = html;
});

window.showProductModal = function (index) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products[index];
    
    if (!product) return;

    document.getElementById('productModalTitle').textContent = product.name;
    document.getElementById('productModalDescription').textContent = product.description;
    document.getElementById('productModalPrice').textContent = 'Rp ' + parseInt(product.price).toLocaleString();
};

