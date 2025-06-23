class LoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.toggleButtons = document.querySelectorAll('.toggle-password');

        if (!this.form || !this.errorMessage || !this.errorText) {
            console.error("Login form elements not found.");
            return;
        }

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.hideError();
        this.checkExistingLogin();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => this.togglePassword(e));
        });

        this.form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.clearInputError(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });

        const closeErrorButton = this.errorMessage.querySelector('.alert-close');
        if (closeErrorButton) {
            closeErrorButton.addEventListener('click', () => this.hideError());
        }
    }

    checkExistingLogin() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                this.redirectBasedOnRole(user.role);
            } catch (e) {
                console.error("Invalid user data in localStorage:", e);
                localStorage.removeItem('currentUser');
            }
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.hideError();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(Array.from(formData.entries()).map(([k, v]) => [k, String(v).trim()]));

        if (!this.validateForm(data)) return;

        this.setLoadingState(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: data.email, password: data.password })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `Login gagal: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                localStorage.setItem('currentUser', JSON.stringify(result.user || result.data));
                localStorage.setItem('userId', result.user?.id || result.data?.id);
                localStorage.setItem('userRole', result.user?.role || result.data?.role);
                localStorage.setItem('loginTime', new Date().toISOString());

                this.handleSuccess(result.user || result.data);
            } else {
                this.handleLoginError(result.message || 'Login gagal.');
            }

        } catch (error) {
            this.handleLoginError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    handleSuccess(user) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Login Berhasil!',
                text: `Selamat datang, ${user.name || user.email}!`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                this.redirectBasedOnRole(user.role);
            });
        } else {
            alert(`Login Berhasil! Selamat datang, ${user.name}`);
            this.redirectBasedOnRole(user.role);
        }
    }

    redirectBasedOnRole(role) {
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'mitra') {
            window.location.href = 'mitra.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    handleLoginError(message) {
        this.showError(message);
    }

    validateForm(data) {
        const emailInput = this.form.querySelector('[name="email"]');
        const passwordInput = this.form.querySelector('[name="password"]');

        this.validateInput(emailInput);
        this.validateInput(passwordInput);

        return !this.form.querySelector('.form-group.error');
    }

    validateInput(input) {
        const value = input.value.trim();
        let error = '';

        if (input.name === 'email' && !value) error = 'Email harus diisi';
        if (input.name === 'password') {
            if (!value) error = 'Password harus diisi';
            else if (value.length < 3) error = 'Password minimal 3 karakter';
        }

        this.setInputValidation(input, !error, error);
    }

    setInputValidation(input, isValid, errorMessage) {
        const group = input.closest('.form-group');
        if (!group) return;

        group.classList.toggle('error', !isValid);
        group.classList.toggle('success', isValid);

        let errorEl = group.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            group.appendChild(errorEl);
        }

        errorEl.textContent = isValid ? '' : errorMessage;
    }

    clearInputError(input) {
        const group = input.closest('.form-group');
        if (!group) return;

        group.classList.remove('error', 'success');
        const errorEl = group.querySelector('.field-error');
        if (errorEl) errorEl.textContent = '';
    }

    showError(msg) {
        this.errorText.textContent = msg;
        this.errorMessage.style.display = 'flex';
        this.errorMessage.classList.add('show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    hideError() {
        this.errorMessage.style.display = 'none';
        this.errorMessage.classList.remove('show');
        this.errorText.textContent = '';
    }

    togglePassword(event) {
        const button = event.currentTarget;
        const container = button.closest('.password-container');
        const input = container?.querySelector('input');
        if (!input) return;

        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';

        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', !isHidden);
            icon.classList.toggle('fa-eye-slash', isHidden);
        }
    }

    setLoadingState(isLoading) {
        const btn = this.form.querySelector('button[type="submit"]');
        if (!btn) return;

        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i> LOGIN...' : 'LOGIN';
        btn.classList.toggle('loading', isLoading);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginForm();
});
