class GamesManager {
  constructor(app) {
    this.app = app;
    this.state = { page: 1, limit: 10, search: '', sortBy: 'id', sortDesc: true };
    this.bindEvents();
    setTimeout(() => this.app.ui.initUploader('game-image-uploader', 'game-thumb-base64', 'gameThumb'), 100);
  }

  bindEvents() {
    document.getElementById('btn-add-game')?.addEventListener('click', () => this.openEditor());
    document.getElementById('btn-save-game')?.addEventListener('click', () => this.save(false));
    document.getElementById('btn-save-game-another')?.addEventListener('click', () => this.save(true));
    document.getElementById('btn-cancel-game')?.addEventListener('click', () => this.cancel());
    
    document.querySelector('#view-games .search-box input')?.addEventListener('input', (e) => {
      this.state.search = e.target.value;
      this.state.page = 1;
      this.renderTable();
    });

    document.getElementById('games-filter-category')?.addEventListener('change', (e) => {
      this.state.filterCategory = e.target.value;
      this.state.page = 1;
      this.renderTable();
    });

    document.getElementById('btn-preview-game')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.app.preview.showPreview('game');
    });

    const liveFields = ['game-name', 'game-category', 'game-featured', 'game-popular', 'game-recommended', 'game-new_game', 'game-thumb-base64', 'game-thumb-url', 'game-description', 'game-status', 'game-order', 'game-banner-url'];
    liveFields.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        this.app.preview.updateGamePreview();
      });
      document.getElementById(id)?.addEventListener('change', () => {
        this.app.preview.updateGamePreview();
      });
    });

    document.querySelectorAll('#view-games th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const sort = th.dataset.sort;
        if(this.state.sortBy === sort) this.state.sortDesc = !this.state.sortDesc;
        else { this.state.sortBy = sort; this.state.sortDesc = false; }
        this.renderTable();
      });
    });

    document.getElementById('game-thumb-url')?.addEventListener('change', async (e) => {
      const url = e.target.value.trim();
      if (url) {
        const isValid = await this.validateImageUrl(url);
        if (isValid) {
          document.getElementById('game-thumb-base64').value = '';
          this.app.ui.getUploader('gameThumb')?.setImage(url);
          this.app.preview.updateGamePreview();
        } else {
          window.ui.toast('رابط الصورة غير صالح أو لا يمكن الوصول إليه', 'error');
          e.target.value = '';
          this.app.ui.getUploader('gameThumb')?.clear();
          this.app.preview.updateGamePreview();
        }
      } else {
        this.app.ui.getUploader('gameThumb')?.clear();
        this.app.preview.updateGamePreview();
      }
    });

    document.getElementById('games-select-all')?.addEventListener('change', (e) => {
      document.querySelectorAll('.game-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btn-apply-bulk')?.addEventListener('click', () => this.applyBulkAction());

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-game');
      const delBtn = e.target.closest('.btn-delete-game');
      const dupBtn = e.target.closest('.btn-duplicate-game');
      
      if(editBtn) this.openEditor(editBtn.dataset.id);
      if(delBtn) this.delete(delBtn.dataset.id);
      if(dupBtn) this.duplicate(dupBtn.dataset.id);
    });

    // Immediate Save for Game Visibility & Options
    const optionToggles = ['game-status', 'game-featured', 'game-popular', 'game-new_game', 'game-recommended'];
    optionToggles.forEach(id => {
      document.getElementById(id)?.addEventListener('change', async (e) => {
        const gameIdStr = document.getElementById('game-id').value;
        if (!gameIdStr) return; 

        const game = await window.api.games.getById(parseInt(gameIdStr));
        if (game) {
          if (id === 'game-status') game.status = e.target.checked ? 'نشط' : 'مخفي';
          else game[id.replace('game-', '')] = e.target.checked ? 1 : 0;
          
          await window.api.games.save(game);
          this.app.refreshAll();
          window.ui.toast('تم الحفظ تلقائياً', 'success');
        }
      });
    });

    const orderInput = document.getElementById('game-order');
    orderInput?.addEventListener('change', async (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 0) {
        val = 0;
        e.target.value = 0;
        window.ui.toast('الترتيب يجب أن يكون رقماً موجباً', 'error');
        return;
      }
      
      const gameIdStr = document.getElementById('game-id').value;
      if (!gameIdStr) return; 

      const game = await window.api.games.getById(parseInt(gameIdStr));
      if (game) {
        game.sort_order = val;
        await window.api.games.save(game);
        this.app.refreshAll();
        window.ui.toast('تم حفظ الترتيب تلقائياً', 'success');
      }
    });
  }

  async renderTable() {
    const tbody = document.getElementById('games-table-tbody');
    if(!tbody) return;

    window.ui.showSkeleton(tbody, 5, 7);

    // Populate category filter
    const filterSelect = document.getElementById('games-filter-category');
    let cats = [];
    if (filterSelect) {
      const currentVal = filterSelect.value;
      cats = await window.api.categories.getCategories();
      filterSelect.innerHTML = '<option value="">كل الأقسام</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      filterSelect.value = currentVal;
    } else {
      cats = await window.api.categories.getCategories();
    }

    let games = await window.api.games.getGames(this.state);

    if (this.state.filterCategory) {
      games = games.filter(g => g.category_id == this.state.filterCategory);
    }
    
    if (this.state.search) {
      const q = this.state.search.toLowerCase();
      games = games.filter(g => (g.title || g.name || '').toLowerCase().includes(q));
    }
    
    if (this.state.sortBy) {
      games.sort((a, b) => {
        let valA = a[this.state.sortBy] || '';
        let valB = b[this.state.sortBy] || '';
        
        if (this.state.sortBy === 'name') {
           valA = a.title || a.name || '';
           valB = b.title || b.name || '';
        }
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return this.state.sortDesc ? 1 : -1;
        if (valA > valB) return this.state.sortDesc ? -1 : 1;
        return 0;
      });
    }

    const start = (this.state.page - 1) * this.state.limit;
    const paginated = games.slice(start, start + this.state.limit);

    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">لا توجد ألعاب مطابقة.</td></tr>`;
      return;
    }

    tbody.innerHTML = paginated.map(g => `
      <tr>
        <td><input type="checkbox" class="game-checkbox" value="${g.id}"></td>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${g.image || g.image_url || 'assets/placeholder.svg'}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" onerror="this.src='assets/placeholder.svg'">
            <span style="font-weight: 500;">${g.title}</span>
          </div>
        </td>
        <td><span class="badge" style="background: var(--primary-light); color: var(--primary);">${cats.find(c => c.id == g.category_id)?.name || 'غير محدد'}</span></td>
        <td><span class="badge ${g.status==='نشط'?'badge-success':'badge-secondary'}">${g.status || 'نشط'}</span></td>
        <td>${g.views || 0}</td>
        <td>${(g.created_at || '').split('T')[0] || '-'}</td>
        <td>
          <button class="btn-icon btn-edit-game" data-id="${g.id}"><i class='bx bx-edit'></i></button>
          <button class="btn-icon btn-duplicate-game" data-id="${g.id}" style="color: var(--info)"><i class='bx bx-copy'></i></button>
          <button class="btn-icon btn-delete-game" data-id="${g.id}" style="color: var(--danger)"><i class='bx bx-trash'></i></button>
        </td>
      </tr>
    `).join('');

    this.renderPagination(Math.ceil(games.length / this.state.limit));
  }

  renderPagination(totalPages) {
    const paginationContainer = document.querySelector('#view-games .pagination');
    if(!paginationContainer) return;

    if(totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    paginationContainer.style.display = 'flex';

    let html = `<button class="page-btn" onclick="app.games.changePage(${this.state.page - 1})" ${this.state.page === 1 ? 'disabled' : ''}><i class='bx bx-chevron-right'></i></button>`;
    
    for(let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${this.state.page === i ? 'active' : ''}" onclick="app.games.changePage(${i})">${i}</button>`;
    }
    
    html += `<button class="page-btn" onclick="app.games.changePage(${this.state.page + 1})" ${this.state.page === totalPages ? 'disabled' : ''}><i class='bx bx-chevron-left'></i></button>`;

    paginationContainer.innerHTML = html;
  }

  changePage(page) {
    this.state.page = page;
    this.renderTable();
  }

  async openEditor(id = null) {
    this.app.navigate('game-editor');
    this.app.isDirty = false;
    
    // Clear form
    document.getElementById('game-id').value = id || '';
    document.getElementById('game-name').value = '';
    document.getElementById('game-description').value = '';
    document.getElementById('game-category').value = '';
    document.getElementById('game-url').value = '';
    const bannerUrlEl = document.getElementById('game-banner-url');
    if (bannerUrlEl) bannerUrlEl.value = '';
    
    document.getElementById('game-featured').checked = false;
    document.getElementById('game-popular').checked = false;
    document.getElementById('game-recommended').checked = false;
    document.getElementById('game-new_game').checked = false;
    document.getElementById('game-url').value = '';
    document.getElementById('game-thumb-base64').value = '';
    document.getElementById('game-thumb-url').value = '';
    document.getElementById('game-status').checked = true;
    document.getElementById('game-order').value = 0;
    this.app.ui.getUploader('gameThumb')?.clear();

    // Populate Categories Dropdown
    const cats = await window.api.categories.getCategories();
    const catSelect = document.getElementById('game-category');
    if(catSelect) {
      catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (id) {
      const game = await window.api.games.getById(parseInt(id));
      if (game) {
        document.getElementById('game-name').value = game.title || '';
        document.getElementById('game-description').value = game.description || '';
        document.getElementById('game-url').value = game.game_url || '';
        document.getElementById('game-banner-url').value = game.banner_url || '';
        
        if (game.image) {
          document.getElementById('game-thumb-base64').value = game.image;
          this.app.ui.getUploader('gameThumb')?.setImage(game.image);
        } else if (game.image_url) {
          document.getElementById('game-thumb-url').value = game.image_url;
          this.app.ui.getUploader('gameThumb')?.setImage(game.image_url);
        }

        if(catSelect && game.category_id) catSelect.value = game.category_id;
        
        document.getElementById('game-featured').checked = game.featured === 1;
        document.getElementById('game-popular').checked = game.popular === 1;
        document.getElementById('game-recommended').checked = game.recommended === 1;
        document.getElementById('game-new_game').checked = game.new_game === 1;
        
        document.getElementById('game-status').checked = game.status === 'نشط' || game.status === true;
        document.getElementById('game-order').value = game.sort_order || 0;
      }
    }
    
    // Ensure live preview reflects the loaded (or empty) data
    this.app.preview.updateGamePreview();
  }

  async cancel() {
    if (this.app.isDirty) {
      const confirmed = await window.ui.confirm('تأكيد', 'هل أنت متأكد من إلغاء التغييرات والعودة؟');
      if (!confirmed) return;
    }
    this.app.isDirty = false;
    this.app.navigate('games');
  }

  async save(addAnother = false) {
    const name = document.getElementById('game-name').value.trim();
    const category_id = document.getElementById('game-category').value;
    const url = document.getElementById('game-url').value.trim();
    const banner_url = document.getElementById('game-banner-url')?.value.trim();

    if (!name) return window.ui.toast('اسم اللعبة مطلوب', 'error');
    if (!category_id) return window.ui.toast('التصنيف مطلوب', 'error');
    if (!url) return window.ui.toast('رابط اللعبة مطلوب', 'error');

    const image = document.getElementById('game-thumb-base64').value;
    const image_url = document.getElementById('game-thumb-url').value.trim();

    if (!image && !image_url) return window.ui.toast('صورة اللعبة مطلوبة', 'error');

    if (image_url && !image) {
      const isValid = await this.validateImageUrl(image_url);
      if (!isValid) return window.ui.toast('رابط الصورة غير صالح', 'error');
    }

    const existingGame = document.getElementById('game-id').value ? await window.api.games.getById(parseInt(document.getElementById('game-id').value)) : null;

    const gameData = {
      id: document.getElementById('game-id').value ? parseInt(document.getElementById('game-id').value) : null,
      title: name,
      description: document.getElementById('game-description').value,
      category_id: parseInt(category_id),
      image: image,
      image_url: image_url,
      game_url: url,
      banner_url: banner_url,
      featured: document.getElementById('game-featured').checked ? 1 : 0,
      popular: document.getElementById('game-popular').checked ? 1 : 0,
      recommended: document.getElementById('game-recommended').checked ? 1 : 0,
      new_game: document.getElementById('game-new_game').checked ? 1 : 0,
      status: document.getElementById('game-status').checked ? 'نشط' : 'مخفي',
      sort_order: parseInt(document.getElementById('game-order').value) || 0,
      created_at: existingGame?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await window.api.games.save(gameData);
    
    window.ui.toast('تم الحفظ بنجاح', 'success');
    this.app.isDirty = false;
    this.app.refreshAll();
    
    if (addAnother) {
      this.openEditor();
    } else {
      this.app.navigate('games');
    }
  }

  async delete(id) {
    if(await window.ui.confirm('تأكيد', 'هل أنت متأكد من الحذف؟')) {
      await window.api.games.delete(parseInt(id));
      window.ui.toast('تم الحذف', 'success');
      this.app.refreshAll();
    }
  }

  async duplicate(id) {
    const game = await window.api.games.getById(parseInt(id));
    if (game) {
      const copy = { ...game };
      delete copy.id;
      copy.title = (copy.title || 'Game') + ' (نسخة)';
      await window.api.games.save(copy);
      window.ui.toast('تم تكرار اللعبة', 'success');
      this.app.refreshAll();
    }
  }



  validateImageUrl(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async applyBulkAction() {
    const action = document.getElementById('games-bulk-action').value;
    const selected = Array.from(document.querySelectorAll('.game-checkbox:checked')).map(cb => parseInt(cb.value));
    
    if(!action || selected.length === 0) return window.ui.toast('اختر إجراء وعناصر أولاً', 'error');
    if(!await window.ui.confirm('تأكيد', 'تنفيذ الإجراء الجماعي؟')) return;

    if(action === 'delete') {
      await window.api.games.bulkDelete(selected);
      window.ui.toast('تم الحذف الجماعي', 'success');
    } else if(action === 'status_active' || action === 'status_hidden') {
      const status = action === 'status_active' ? 'نشط' : 'مخفي';
      for(let id of selected) {
        const game = await window.api.games.getById(id);
        if(game) {
          game.status = status;
          await window.api.games.save(game);
        }
      }
      window.ui.toast('تم تحديث الحالة الجماعي', 'success');
    }
    document.getElementById('games-select-all').checked = false;
    this.app.refreshAll();
  }
}
window.GamesManager = GamesManager;
