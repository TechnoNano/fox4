class UIManager {
  constructor(app) {
    this.app = app;
    this.uploaders = {};
    this.bindGlobalEvents();
    setTimeout(() => {
      this.initUploader('admin-avatar-uploader', 'input-admin-avatar-base64', 'adminAvatar');
    }, 100);
    this.loadAdminProfile();
  }

  bindGlobalEvents() {
    const sidebar = document.getElementById('sidebar');
    
    // Restore sidebar state
    if(localStorage.getItem('sidebar_collapsed') === 'true' && window.innerWidth > 992) {
      sidebar?.classList.add('collapsed');
    }

    document.getElementById('toggle-sidebar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMobile = window.innerWidth <= 992;
      sidebar?.classList.toggle(isMobile ? 'mobile-open' : 'collapsed');
      
      if(!isMobile) {
        localStorage.setItem('sidebar_collapsed', sidebar?.classList.contains('collapsed'));
      }
    });

    // Close on Outside Click
    document.addEventListener('click', (e) => {
      if(window.innerWidth <= 992 && sidebar?.classList.contains('mobile-open')) {
        if(!sidebar.contains(e.target) && !e.target.closest('#toggle-sidebar')) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && window.innerWidth <= 992) {
        sidebar?.classList.remove('mobile-open');
      }
    });

    document.querySelectorAll('.menu-item[data-view]').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (this.app.isDirty) {
          const proceed = await window.ui.confirm('تحذير', 'توجد تغييرات غير محفوظة. المتابعة؟');
          if (!proceed) return;
        }
        
        // Auto close on mobile
        if(window.innerWidth <= 992) {
          sidebar?.classList.remove('mobile-open');
        }
        
        this.app.navigate(e.currentTarget.getAttribute('data-view'));
      });
    });

    const editorInputs = document.querySelectorAll(`
      #view-game-editor input, #view-game-editor select, #view-game-editor textarea,
      #view-category-editor input, #view-category-editor select, #view-category-editor textarea,
      #view-banner-editor input, #view-banner-editor select, #view-banner-editor textarea
    `);
    editorInputs.forEach(el => {
      el.addEventListener('input', () => this.app.isDirty = true);
      el.addEventListener('change', () => this.app.isDirty = true);
    });



    // Topbar Global Search
    const globalSearch = document.querySelector('.topbar-right .search-box input');
    globalSearch?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if(val) {
          this.app.navigate('games');
          const gamesSearch = document.querySelector('#view-games .search-box input');
          if(gamesSearch) {
            gamesSearch.value = val;
            gamesSearch.dispatchEvent(new Event('input')); // trigger games search
          }
        }
      }
    });

    // Admin Profile Dropdown
    const adminProfileBtn = document.getElementById('admin-profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    adminProfileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if(profileDropdown) {
        profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'flex' : 'none';
      }
    });

    document.addEventListener('click', () => {
      if(profileDropdown) profileDropdown.style.display = 'none';
    });

    // Logout
    document.querySelector('.logout-container .logout')?.addEventListener('click', this.handleLogout.bind(this));
    document.getElementById('btn-logout-dropdown')?.addEventListener('click', this.handleLogout.bind(this));

    // Edit Profile Modal
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeProfileModal = () => {
      if (editProfileModal) {
        const content = editProfileModal.querySelector('.modal-content');
        content?.classList.remove('show');
        setTimeout(() => editProfileModal.classList.add('hidden'), 200);
      }
    };

    document.getElementById('btn-edit-profile')?.addEventListener('click', async () => {
      const profile = await window.api.admin.getProfile();
      document.getElementById('input-admin-name').value = profile.name || '';
      document.getElementById('input-admin-username').value = profile.username || '';
      document.getElementById('input-admin-role').value = profile.role || '';
      document.getElementById('input-admin-email').value = profile.email || '';
      
      const avatarVal = profile.avatar || '';
      document.getElementById('input-admin-avatar').value = avatarVal.startsWith('data:') ? '' : avatarVal;
      document.getElementById('input-admin-avatar-base64').value = avatarVal.startsWith('data:') ? avatarVal : '';
      
      this.getUploader('adminAvatar')?.clear();
      if(avatarVal) {
        this.getUploader('adminAvatar')?.setImage(avatarVal);
      }

      if(profileDropdown) profileDropdown.style.display = 'none';
      if(editProfileModal) {
        editProfileModal.classList.remove('hidden');
        setTimeout(() => editProfileModal.querySelector('.modal-content')?.classList.add('show'), 10);
      }
    });

    document.getElementById('input-admin-avatar')?.addEventListener('change', (e) => {
      const url = e.target.value.trim();
      if(url) {
        document.getElementById('input-admin-avatar-base64').value = '';
        this.getUploader('adminAvatar')?.setImage(url);
      }
    });

    document.getElementById('btn-close-profile-modal')?.addEventListener('click', closeProfileModal);
    document.getElementById('btn-cancel-profile')?.addEventListener('click', closeProfileModal);

    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      const name = document.getElementById('input-admin-name').value.trim();
      const username = document.getElementById('input-admin-username').value.trim();
      const role = document.getElementById('input-admin-role').value.trim();
      const email = document.getElementById('input-admin-email').value.trim();
      const avatarBase64 = document.getElementById('input-admin-avatar-base64').value;
      const avatarUrl = document.getElementById('input-admin-avatar').value.trim();
      const avatar = avatarBase64 || avatarUrl;
      
      if(!name || !username || !role || !email) {
        return window.ui.toast('يرجى ملء جميع الحقول الأساسية', 'error');
      }

      try {
        const profile = await window.api.admin.getProfile();
        profile.name = name;
        profile.username = username;
        profile.role = role;
        profile.email = email;
        profile.avatar = avatar;

        await window.api.admin.saveProfile(profile);

        // Update UI
        this.updateAdminProfileUI(profile);

        // Sync fallback localStorage items
        localStorage.setItem('admin_name', name);
        localStorage.setItem('admin_role', role);
        localStorage.setItem('admin_email', email);
        localStorage.setItem('admin_avatar', avatar);

        window.ui.toast('تم تحديث الملف الشخصي بنجاح', 'success');
        closeProfileModal();
      } catch (err) {
        window.ui.toast('حدث خطأ أثناء الحفظ', 'error');
      }
    });

    // Change Password Modal
    const changePasswordModal = document.getElementById('change-password-modal');
    const closePasswordModal = () => {
      if (changePasswordModal) {
        const content = changePasswordModal.querySelector('.modal-content');
        content?.classList.remove('show');
        setTimeout(() => changePasswordModal.classList.add('hidden'), 200);
      }
    };

    document.getElementById('btn-change-password')?.addEventListener('click', () => {
      document.getElementById('input-current-password').value = '';
      document.getElementById('input-new-password').value = '';
      if(profileDropdown) profileDropdown.style.display = 'none';
      if(changePasswordModal) {
        changePasswordModal.classList.remove('hidden');
        setTimeout(() => changePasswordModal.querySelector('.modal-content')?.classList.add('show'), 10);
      }
    });

    document.getElementById('btn-close-password-modal')?.addEventListener('click', closePasswordModal);
    document.getElementById('btn-cancel-password')?.addEventListener('click', closePasswordModal);

    document.getElementById('btn-save-password')?.addEventListener('click', async () => {
      const currentPass = document.getElementById('input-current-password').value;
      const newPass = document.getElementById('input-new-password').value;
      
      if(!currentPass || !newPass) {
        return window.ui.toast('يرجى ملء جميع الحقول', 'error');
      }
      if (newPass.length < 6) {
        return window.ui.toast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
      }

      try {
        // Use server-side endpoint so current password is verified against the hash
        await window.api.admin.changePassword(currentPass, newPass);
        window.ui.toast('تم تغيير كلمة المرور بنجاح', 'success');
        closePasswordModal();
      } catch (err) {
        window.ui.toast(err.message || 'كلمة المرور الحالية غير صحيحة', 'error');
      }
    });

    // Click outside to close modals
    editProfileModal?.addEventListener('click', (e) => {
      if (e.target === editProfileModal) closeProfileModal();
    });
    changePasswordModal?.addEventListener('click', (e) => {
      if (e.target === changePasswordModal) closePasswordModal();
    });

    // Escape key listener to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeProfileModal();
        closePasswordModal();
      }
    });
  }

  async loadAdminProfile() {
    try {
      const profile = await window.api.admin.getProfile();
      this.updateAdminProfileUI(profile);
    } catch(e) {
      console.error("Error loading admin profile:", e);
    }
  }

  updateAdminProfileUI(profile) {
    if(!profile) return;
    
    const nameEl = document.getElementById('admin-name-text');
    if(nameEl) nameEl.textContent = profile.name;

    const roleEl = document.getElementById('admin-role-text');
    if(roleEl) roleEl.textContent = profile.role;

    const emailEl = document.getElementById('admin-email-text');
    if(emailEl) emailEl.textContent = profile.email;

    const avatarImg = document.getElementById('admin-avatar-img');
    if(avatarImg) {
      avatarImg.src = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4F46E5&color=fff`;
    }
  }

  handleLogout() {
    window.ui.confirm('تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟').then(res => {
      if(res) {
        window.auth.logout();
        localStorage.removeItem('admin_name');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_email');
        localStorage.removeItem('admin_avatar');
        localStorage.removeItem('last_view');
        window.ui.toast('تم تسجيل الخروج', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }

  initUploader(elementId, hiddenInputId, uploaderKey) {
    const el = document.getElementById(elementId);
    if(el) {
      this.uploaders[uploaderKey] = new Uploader(el, {
        onUpload: (base64) => { 
          const input = document.getElementById(hiddenInputId);
          if (input) {
            input.value = base64 || '';
            // Handle Game Thumb URL input clearing
            if (hiddenInputId === 'game-thumb-base64') {
              const urlInput = document.getElementById('game-thumb-url');
              if (urlInput && base64) urlInput.value = '';
            }
            // Handle Admin Avatar URL input clearing
            if (hiddenInputId === 'input-admin-avatar-base64') {
              const urlInput = document.getElementById('input-admin-avatar');
              if (urlInput && base64) urlInput.value = '';
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          this.app.isDirty = true; 
        }
      });
    }
  }

  getUploader(key) { return this.uploaders[key]; }

  initDragAndDrop(tbody, onReorder) {
    if(!tbody) return;
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);
    
    let draggedRow = null;
    newTbody.addEventListener('dragstart', (e) => {
      if(e.target.tagName === 'TR') {
        draggedRow = e.target;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.style.opacity = '0.5', 0);
      }
    });
    newTbody.addEventListener('dragend', (e) => {
      if(e.target.tagName === 'TR') {
        e.target.style.opacity = '1';
        const rows = Array.from(newTbody.querySelectorAll('tr'));
        rows.forEach(r => r.classList.remove('drag-over'));
        onReorder(rows.map(r => r.dataset.id));
      }
    });
    newTbody.addEventListener('dragover', (e) => {
      e.preventDefault();
      const targetRow = e.target.closest('tr');
      if(targetRow && targetRow !== draggedRow) {
        targetRow.classList.add('drag-over');
        const bounding = targetRow.getBoundingClientRect();
        if(e.clientY - (bounding.y + bounding.height / 2) > 0) targetRow.after(draggedRow);
        else targetRow.before(draggedRow);
      }
    });
    newTbody.addEventListener('dragleave', (e) => {
      const targetRow = e.target.closest('tr');
      if(targetRow) targetRow.classList.remove('drag-over');
    });
  }
}
window.UIManager = UIManager;
