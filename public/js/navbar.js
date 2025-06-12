function initializeNavbar() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        showUserMenu(user);
    } else {
        showGuestMenu();
    }
}

function showUserMenu(user) {
    const guestMenu = document.getElementById('guestMenu');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const roleName = document.getElementById('roleName');
    const roleLink = document.getElementById('roleLink');

    if (!userMenu || !userName || !roleName || !roleLink || !guestMenu) return;

    guestMenu.style.display = 'none';
    userMenu.style.display = 'block';
    userName.textContent = user.name ? user.name.split(' ')[0] : 'User';

    if (user.role === 'admin') {
        roleName.textContent = 'Admin';
        roleLink.href = 'admin.html';
        roleLink.querySelector('i').className = 'fas fa-user-shield';
    } else if (user.role === 'mitra') {
        roleName.textContent = 'Mitra';
        roleLink.href = 'mitra.html';
        roleLink.querySelector('i').className = 'fas fa-handshake';
    } else {
        roleName.textContent = user.role;
        roleLink.href = '#';
        roleLink.querySelector('i').className = 'fas fa-user-tag';
    }
}

function showGuestMenu() {
    const guestMenu = document.getElementById('guestMenu');
    const userMenu = document.getElementById('userMenu');
    if (!guestMenu || !userMenu) return;
    guestMenu.style.display = 'block';
    userMenu.style.display = 'none';
}

function logout() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Keluar Akun?',
            text: "Apakah Anda yakin ingin keluar?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Logout',
            cancelButtonText: 'Batal',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) performLogout();
        });
    } else {
        if (confirm('Apakah Anda yakin ingin logout?')) performLogout();
    }
}

function performLogout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userToken');
        sessionStorage.clear();
        showLogoutMessage();
        setTimeout(() => window.location.href = 'index.html', 1500);
    }).catch(() => {
        window.location.href = 'index.html';
    });
}

function showLogoutMessage() {
    const notification = document.createElement('div');
    notification.className = 'logout-notification';
    notification.innerHTML = `
        <div class="alert alert-success" style="
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
            <i class="fas fa-check-circle"></i>
            Logout berhasil! Mengalihkan ke halaman utama...
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 3000);
    showGuestMenu();
}

// Buat function global agar bisa diakses inline onclick di HTML
window.logout = logout;
