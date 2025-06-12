class LoginForm {
  constructor() {
    this.form = document.getElementById('loginForm');
    this.errorMessage = document.getElementById('errorMessage');
    this.errorText = document.getElementById('errorText');
    this.toggleButtons = document.querySelectorAll('.toggle-password');
    this.init();
  }

  // ========================
  //  INITIALIZATION METHODS
  // ========================
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
      input.addEventListener('blur', () => this.validateInput(input));
      input.addEventListener('input', () => this.clearInputError(input));
    });
  }

  checkExistingLogin() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      this.redirectBasedOnRole(user.role);
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
      // Kirim permintaan login ke server
      const response = await fetch('http://localhost:5500/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });

      // Pastikan response berhasil sebelum memproses
      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.handleSuccess(result.data);
      } else {
        this.handleLoginError(result.message);
      }
    } catch (error) {
      this.handleLoginError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  handleSuccess(user) {
    // Simpan data user ke localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('loginTime', new Date().toISOString());
    
    this.showSuccessMessage(`Selamat datang, ${user.name}!`);
    this.form.reset();
    
    setTimeout(() => {
      this.redirectBasedOnRole(user.role);
    }, 2000);
  }

  redirectBasedOnRole(role) {
    switch(role) {
      case 'admin':
        window.location.href = 'admin.html';
        break;
      case 'mitra':
        window.location.href = 'mitra.html';
        break;
      default:
        window.location.href = 'index.html';
    }
  }

  handleLoginError(message) {
    this.showError(message);
  }

  // ========================
  //  VALIDATION METHODS
  // ========================
  validateForm(data) {
    const validationRules = [
      [!data.email, 'Email/Username harus diisi'],
      [!data.password, 'Password harus diisi'],
      [data.password && data.password.length < 3, 'Password minimal 3 karakter']
    ];

    for (const [condition, message] of validationRules) {
      if (condition) {
        this.showError(message);
        return false;
      }
    }
    return true;
  }

  validateInput(input) {
    const value = input.value.trim();
    let error = '';

    switch (input.name) {
      case 'email':
        if (!value) error = 'Email/Username harus diisi';
        break;
      case 'password':
        if (!value) error = 'Password harus diisi';
        else if (value.length < 3) error = 'Password minimal 3 karakter';
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
    formGroup.classList.toggle('success', isValid && input.value.trim());

    const errorElement = formGroup.querySelector('.field-error') || 
                         document.createElement('div');
    
    if (!formGroup.contains(errorElement)) {
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
      ? '<i class="fas fa-spinner fa-spin"></i> LOGIN...' 
      : 'LOGIN';
    button.classList.toggle('loading', isLoading);
  }

  showSuccessMessage(message) {
    let successElement = document.getElementById('successMessage') || 
                         this.createSuccessElement();
    
    document.getElementById('successText').textContent = 
      `${message} - Mengalihkan ke dashboard...`;
    
    successElement.style.display = 'flex';
    successElement.classList.add('show');
  }

  createSuccessElement() {
    const element = document.createElement('div');
    element.id = 'successMessage';
    element.className = 'success-message';
    element.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span id="successText"></span>
    `;
    this.form.parentNode.insertBefore(element, this.form);
    return element;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new LoginForm();
});

export default LoginForm;