class App {
  constructor() {
    this.currentView = localStorage.getItem('last_view') || 'home-manager';
    this.isDirty = false;
    this.initialized = false;

    this.preInit();
  }

  async preInit() {
    try {
      await window.api.init();
      this.checkAuth();
    } catch (e) {
      console.error(e);
      window.ui?.toast("فشل التهيئة", "error");
    }
  }

  checkAuth() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.querySelector('.app-container');

    if (window.auth.isAuthenticated()) {
      if (loginContainer) loginContainer.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      
      this.bootstrapApp();
    } else {
      if (loginContainer) loginContainer.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      
      this.bindLoginEvents();
    }
  }

  bootstrapApp() {
    if (this.initialized) return;

    // Modules
    this.ui = new window.UIManager(this);
    this.games = new window.GamesManager(this);
    this.categories = new window.CategoriesManager(this);
    this.banners = new window.BannersManager(this);
    this.stats = new window.StatisticsManager(this);
    this.preview = new window.PreviewManager(this);
    this.settings = new window.SettingsManager(this);

    this.initialized = true;
    this.init();
  }

  async init() {
    try {
      await this.refreshAll();
      this.navigate(this.currentView);
    } catch (e) {
      console.error(e);
      window.ui?.toast("فشل التهيئة", "error");
    }
  }

  bindLoginEvents() {
    const btnSubmit = document.getElementById('btn-login-submit');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const rememberCheckbox = document.getElementById('login-remember');
    const togglePasswordBtn = document.getElementById('btn-toggle-password');
    const togglePasswordIcon = document.getElementById('toggle-password-icon');
    const errorArea = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');

    // Toggle Password Visibility
    togglePasswordBtn?.addEventListener('click', () => {
      if (passwordInput) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        if (togglePasswordIcon) {
          togglePasswordIcon.className = type === 'password' ? 'bx bx-show' : 'bx bx-hide';
        }
      }
    });

    const showError = (msg) => {
      if (errorMsg && errorArea) {
        errorMsg.textContent = msg;
        errorArea.classList.add('show');
      }
    };

    const clearError = () => {
      if (errorArea) errorArea.classList.remove('show');
    };

    const handleLoginSubmit = async () => {
      clearError();
      const user = usernameInput?.value || '';
      const pass = passwordInput?.value || '';
      const remember = rememberCheckbox?.checked || false;

      try {
        const success = await window.auth.login(user, pass, remember);
        if (success) {
          // Clear inputs
          if (usernameInput) usernameInput.value = '';
          if (passwordInput) passwordInput.value = '';
          
          this.checkAuth();
        }
      } catch (err) {
        showError(err.message);
      }
    };

    btnSubmit?.addEventListener('click', handleLoginSubmit);

    [usernameInput, passwordInput].forEach(input => {
      input?.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') await handleLoginSubmit();
      });
      input?.addEventListener('input', clearError);
    });
  }

  async navigate(viewName) {
    if (!window.auth.isAuthenticated()) {
      this.checkAuth();
      return;
    }

    if (this.currentView === viewName && document.getElementById(`view-${viewName}`)?.classList.contains('active')) return;

    if (this.isDirty) {
      const confirmed = await window.ui.confirm('تغييرات غير محفوظة', 'يوجد تغييرات لم تقم بحفظها، هل أنت متأكد من المغادرة؟');
      if (!confirmed) return;
    }

    const viewToMenuMap = {
      'game-editor': 'games',
      'category-editor': 'categories',
      'banner-editor': 'banners'
    };
    const targetMenu = viewToMenuMap[viewName] || viewName;

    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === targetMenu) {
        item.classList.add('active');
        const titleEl = document.getElementById('page-title');
        // Only override title if it's not an editor, as editors have their own specific titles (e.g., "Add Game")
        if(titleEl && targetMenu === viewName) {
          titleEl.textContent = item.querySelector('.menu-text').textContent;
        }
      }
    });

    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.remove('active');
      if (section.id === `view-${viewName}`) section.classList.add('active');
    });

    this.currentView = viewName;
    localStorage.setItem('last_view', viewName);
    this.isDirty = false;

    // Trigger explicit renders
    if(viewName === 'home-manager') this.stats.render();
    if(viewName === 'games') this.games.renderTable();
    if(viewName === 'categories') this.categories.renderTable();
    if(viewName === 'banners') this.banners.renderTable();
    if(viewName === 'statistics') this.stats.render();
  }

  async refreshAll() {
    this.stats.render(); // Always update statistics
    if(this.currentView === 'games') this.games.renderTable();
    if(this.currentView === 'categories') this.categories.renderTable();
    if(this.currentView === 'banners') this.banners.renderTable();
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
