class RegisterForm {
  constructor() {
    this.form = document.getElementById('registerForm');
    this.errorMessage = document.getElementById('errorMessage');
    this.errorText = document.getElementById('errorText');
    this.toggleButtons = document.querySelectorAll('.toggle-password');
    this.serverURL = this.detectServerURL();
    this.init();
  }

  // ========================
  //  INITIALIZATION METHODS
  // ========================
  init() {
    this.setupEventListeners();
    this.hideError();
    // Nonaktifkan health check untuk sementara
    // this.testServerConnection();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    this.toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => this.togglePassword(e));
    });

    this.form.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', () => this.validateInput(input));
      input.addEventListener('input', () => this.clearInputError(input));
    });
  }

  // ========================
  //  SERVER CONFIGURATION
  // ========================
  detectServerURL() {
    const { protocol, hostname, port } = window.location;
    
    if (port === '5500' || port === '5501') {
      return `${protocol}//${hostname}:5500`;
    }
    
    return window.location.origin;
  }

  async testServerConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      // PERBAIKAN: Tambahkan fetch request
      const response = await fetch(`${this.serverURL}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Server connection failed:', error);
      this.showError(
        error.name === 'AbortError' 
          ? 'Server tidak merespons. Pastikan backend berjalan.'
          : `Koneksi server gagal: ${error.message}`
      );
    }
  }

  // ========================
  //  FORM HANDLING
  // ========================
async handleSubmit(event) {
  event.preventDefault();
  this.hideError();

  const formData = new FormData(this.form);
  const data = Object.fromEntries(
    Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  );

  if (!this.validateForm(data)) return;

  this.setLoadingState(true);

  try {
    const response = await fetch(`${this.serverURL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      this.handleSuccess(result.message);
    } else {
      this.showError(result.message || 'Gagal registrasi');
    }
  } catch (error) {
    this.showError(error.message);
  } finally {
    this.setLoadingState(false);
  }
}


  async handleResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${contentType} - ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      
      if (response.ok && result.success) {
        this.handleSuccess(result.message);
      } else {
        this.handleServerError(response.status, result);
      }
    } catch (error) {
      console.error('Response handling error:', error);
      this.showError('Terjadi kesalahan saat memproses respons server');
    }
  }

  handleServerError(status, result) {
    const errorMap = {
      400: result.message || 'Data tidak valid',
      401: 'Autentikasi gagal',
      403: 'Akses ditolak',
      409: result.message || 'Email sudah terdaftar',
      422: 'Data tidak memenuhi persyaratan',
      500: 'Kesalahan server internal'
    };

    this.showError(errorMap[status] || `Error ${status}: ${result.message || 'Terjadi kesalahan'}`);
  }

  handleFetchError(error) {
    console.error('Fetch error:', error);
    
    const errorMessages = {
      'Failed to fetch': 'Tidak dapat terhubung ke server',
      'Network request failed': 'Jaringan bermasalah',
      'AbortError': 'Permintaan timeout'
    };

    this.showError(
      errorMessages[error.name] || 
      errorMessages[error.message] || 
      `Kesalahan jaringan: ${error.message || 'Tidak diketahui'}`
    );
  }

  // ========================
  //  VALIDATION METHODS
  // ========================
  validateForm(data) {
    const validationRules = [
      [!data.name, 'Nama harus diisi'],
      [data.name && data.name.length < 2, 'Nama minimal 2 karakter'],
      [!data.email, 'Email harus diisi'],
      [data.email && !this.isValidEmail(data.email), 'Format email tidak valid'],
      [!data.password, 'Password harus diisi'],
      [data.password && data.password.length < 8, 'Password minimal 8 karakter'],
      [!data.confirmPassword, 'Konfirmasi password harus diisi'],
      [data.password !== data.confirmPassword, 'Konfirmasi password tidak sesuai']
    ];

    for (const [condition, message] of validationRules) {
      if (condition) {
        this.showError(message);
        return false;
      }
    }
    return true;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validateInput(input) {
    const value = input.value.trim();
    let error = '';

    switch (input.name) {
      case 'name':
        if (!value) error = 'Nama harus diisi';
        else if (value.length < 2) error = 'Nama minimal 2 karakter';
        break;
      case 'email':
        if (!value) error = 'Email harus diisi';
        else if (!this.isValidEmail(value)) error = 'Format email tidak valid';
        break;
      case 'password':
        if (!value) error = 'Password harus diisi';
        else if (value.length < 8) error = 'Password minimal 8 karakter';
        break;
      case 'confirmPassword':
        const password = this.form.querySelector('[name="password"]').value;
        if (!value) error = 'Konfirmasi password harus diisi';
        else if (value !== password) error = 'Konfirmasi password tidak sesuai';
        break;
    }

    this.setInputValidation(input, !error, error);
  }

  // ========================
  //  UI METHODS
  // ========================
  setInputValidation(input, isValid, errorMessage) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.toggle('error', !isValid);
    
    // Hanya tambah kelas success jika ada nilai
    formGroup.classList.toggle('success', isValid && input.value.trim() !== '');

    let errorElement = formGroup.querySelector('.field-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      formGroup.appendChild(errorElement);
    }

    errorElement.textContent = isValid ? '' : errorMessage;
  }

  clearInputError(input) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('error');
    
    const errorElement = formGroup.querySelector('.field-error');
    if (errorElement) errorElement.textContent = '';
  }

  showError(message) {
    this.errorText.textContent = message;
    this.errorMessage.style.display = 'flex';
    this.errorMessage.classList.add('show');
    
    // Animasi shake untuk menarik perhatian
    this.errorMessage.classList.add('shake');
    setTimeout(() => {
      this.errorMessage.classList.remove('shake');
    }, 500);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hideError() {
    this.errorMessage.style.display = 'none';
    this.errorMessage.classList.remove('show');
  }

  togglePassword(event) {
    const button = event.currentTarget;
    const container = button.closest('.password-container');
    const input = container.querySelector('input');
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    button.classList.toggle('fa-eye-slash', isPassword);
    button.classList.toggle('fa-eye', !isPassword);
  }

  setLoadingState(isLoading) {
    const button = this.form.querySelector('button[type="submit"]');
    button.disabled = isLoading;
    button.innerHTML = isLoading 
      ? '<i class="fas fa-spinner fa-spin"></i> MENDAFTAR...' 
      : 'DAFTAR SEBAGAI MITRA';
    button.classList.toggle('loading', isLoading);
  }

  handleSuccess(message) {
    this.showSuccessMessage('Registrasi berhasil! Mohon tunggu 1-2 jam, admin akan memproses akun Anda.');
    this.form.reset();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3500);
  }

  showSuccessMessage(message) {
    let successElement = document.getElementById('successMessage');
    if (!successElement) {
      successElement = document.createElement('div');
      successElement.id = 'successMessage';
      successElement.className = 'success-message';
      successElement.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span id="successText"></span>
      `;
      this.form.parentNode.insertBefore(successElement, this.form);
    }
    
    document.getElementById('successText').textContent = 
      `${message} - Mengalihkan ke halaman login...`;
    
    successElement.style.display = 'flex';
    successElement.classList.add('show');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new RegisterForm();
});

export default RegisterForm;