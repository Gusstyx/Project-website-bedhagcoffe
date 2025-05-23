document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
        const input = icon.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye-slash');
        icon.classList.toggle('fa-eye');
    });
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorMessage.classList.remove('show');

    const name = e.target.name.value;
    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    // Validasi client-side
    if (password !== confirmPassword) {
        errorText.textContent = 'Password tidak sama. Silakan periksa kembali.';
        errorMessage.classList.add('show');
        document.querySelectorAll('.password-container').forEach(container => {
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 500);
        });
        return;
    }

    if (password.length < 8) {
        errorText.textContent = 'Password minimal 8 karakter.';
        errorMessage.classList.add('show');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        // Cek jika respons bukan JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server mengembalikan respons tidak valid');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registrasi gagal');
        }

        window.location.href = 'login.html?registered=true';
    } catch (error) {
        errorText.textContent = error.message;
        errorMessage.classList.add('show');
        console.error('Error:', error);
    }
});