class SettingsManager {
  constructor(app) {
    this.app = app;
    this.bindEvents();
    setTimeout(() => {
      this.app.ui.initUploader('setting-logo-uploader', 'setting-logo-base64', 'settingLogo');
      this.loadSettings();
    }, 200);
  }

  bindEvents() {
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());

    document.getElementById('setting-logo-url')?.addEventListener('change', (e) => {
      const url = e.target.value.trim();
      if (url) {
        document.getElementById('setting-logo-base64').value = '';
        this.app.ui.getUploader('settingLogo')?.setImage(url);
      }
    });

    const inputs = document.querySelectorAll('#view-settings input, #view-settings textarea');
    inputs.forEach(el => el.addEventListener('input', () => this.app.isDirty = true));
  }

  async loadSettings() {
    try {
      const s = await window.api.settings.getSettings();

      // Map DB keys to UI element IDs
      this._set('setting-app-name',     s.appName     || '');
      this._set('setting-app-version',  s.appVersion  || s.version || '');
      this._set('setting-about-text',   s.aboutText   || s.about  || '');
      this._set('setting-copyright',    s.copyright   || '');
      this._set('setting-telegram-url', s.telegramUrl || s.telegram || '');
      this._set('setting-privacy-url',  s.privacyUrl  || s.privacyPolicy || '');
      this._set('setting-support-url',  s.supportUrl  || '');
      this._set('setting-support-email',s.supportEmail || '');
      this._set('setting-terms-url',    s.termsUrl    || '');
      this._set('setting-contact-info', s.contactInfo || '');

      // Maintenance mode toggle
      const maintenanceEl = document.getElementById('setting-maintenance-mode');
      if (maintenanceEl) {
        maintenanceEl.checked = s.maintenanceMode === 'true' || s.maintenanceMode === true;
      }

      // Logo
      const logoVal = s.logo || '';
      this._set('setting-logo-url', logoVal.startsWith('data:') ? '' : logoVal);
      this._set('setting-logo-base64', logoVal.startsWith('data:') ? logoVal : '');

      this.app.ui.getUploader('settingLogo')?.clear();
      if (logoVal) this.app.ui.getUploader('settingLogo')?.setImage(logoVal);

      this.app.isDirty = false;
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }

  _set(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  _get(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  async saveSettings() {
    try {
      const appName = this._get('setting-app-name').trim();
      if (!appName) return window.ui.toast('اسم التطبيق مطلوب', 'error');

      const logoBase64 = this._get('setting-logo-base64');
      const logoUrl    = this._get('setting-logo-url').trim();
      const logo       = logoBase64 || logoUrl;

      const maintenanceEl = document.getElementById('setting-maintenance-mode');

      const data = {
        appName,
        appVersion:      this._get('setting-app-version').trim(),
        logo,
        maintenanceMode: maintenanceEl?.checked ? 'true' : 'false',
        aboutText:       this._get('setting-about-text').trim(),
        copyright:       this._get('setting-copyright').trim(),
        telegramUrl:     this._get('setting-telegram-url').trim(),
        privacyUrl:      this._get('setting-privacy-url').trim(),
        supportUrl:      this._get('setting-support-url').trim(),
        supportEmail:    this._get('setting-support-email').trim(),
        termsUrl:        this._get('setting-terms-url').trim(),
        contactInfo:     this._get('setting-contact-info').trim()
      };

      await window.api.settings.saveSettings(data);
      window.ui.toast('تم حفظ الإعدادات بنجاح', 'success');
      this.app.isDirty = false;
    } catch (e) {
      console.error('Error saving settings', e);
      window.ui.toast('حدث خطأ أثناء الحفظ', 'error');
    }
  }
}

window.SettingsManager = SettingsManager;
