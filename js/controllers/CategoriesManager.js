class CategoriesManager {
  constructor(app) {
    this.app = app;
    this.state = { search: '', page: 1, limit: 10 };
    setTimeout(() => {
      this.app.ui.initUploader('category-image-uploader', 'category-image-base64', 'categoryImage');
      this.app.ui.initUploader('category-icon-uploader', 'category-icon-base64', 'categoryIcon');
    }, 100);
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-add-category')?.addEventListener('click', () => this.openEditor());
    document.getElementById('btn-save-category')?.addEventListener('click', () => this.save());
    document.getElementById('btn-cancel-category')?.addEventListener('click', () => this.cancel());

    document.getElementById('categories-search')?.addEventListener('input', (e) => {
      this.state.search = e.target.value.toLowerCase();
      this.renderTable();
    });

    document.getElementById('categories-select-all')?.addEventListener('change', (e) => {
      document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btn-apply-bulk-categories')?.addEventListener('click', () => this.applyBulkAction());

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-category');
      const openBtn = e.target.closest('.btn-open-category');
      const delBtn = e.target.closest('.btn-delete-category');
      if(editBtn) this.openEditor(editBtn.dataset.id);
      if(openBtn) this.openDetails(openBtn.dataset.id);
      if(delBtn) this.delete(delBtn.dataset.id);
    });
  }

  async renderTable() {
    const tbody = document.getElementById('categories-table-tbody');
    if(!tbody) return;

    window.ui.showSkeleton(tbody, 5, 7);

    // categories API now returns game_count directly from the backend
    let cats = await window.api.categories.getCategories();
    
    if (this.state.search) {
      cats = cats.filter(c => c.name.toLowerCase().includes(this.state.search));
    }

    const totalPages = Math.ceil(cats.length / this.state.limit);
    if (this.state.page > totalPages && totalPages > 0) this.state.page = totalPages;

    const start = (this.state.page - 1) * this.state.limit;
    const paginatedCats = cats.slice(start, start + this.state.limit);

    if (cats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد أقسام</td></tr>';
    } else {
      tbody.innerHTML = paginatedCats.map(c => `
        <tr class="draggable" data-id="${c.id}">
          <td><input type="checkbox" class="category-checkbox" value="${c.id}"></td>
          <td>
            <img src="${c.icon || 'assets/placeholder.svg'}" style="width:30px;height:30px;border-radius:4px;object-fit:cover;" onerror="this.src='assets/placeholder.svg'">
          </td>
          <td style="font-weight: 500;">${c.name}</td>
          <td>${c.gamesCount || 0}</td>
          <td>${c.order || 0}</td>
          <td><span class="badge ${c.status==='نشط'?'badge-success':'badge-secondary'}">${c.status || 'نشط'}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm btn-open-category" data-id="${c.id}">إدارة الألعاب</button>
            <button class="btn-icon btn-edit-category" data-id="${c.id}"><i class='bx bx-edit'></i></button>
            <button class="btn-icon btn-delete-category" data-id="${c.id}" style="color: var(--danger)"><i class='bx bx-trash'></i></button>
          </td>
        </tr>
      `).join('');
    }

    this.renderPagination(totalPages);

    this.app.ui.initDragAndDrop(tbody, async (ids) => {
      await window.api.categories.reorder(ids);
      this.app.refreshAll();
    });
  }

  renderPagination(totalPages) {
    const container = document.getElementById('categories-pagination');
    if (!container) return;
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `<button class="page-btn" ${this.state.page === 1 ? 'disabled' : ''} data-page="${this.state.page - 1}"><i class='bx bx-chevron-right'></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${this.state.page === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" ${this.state.page === totalPages ? 'disabled' : ''} data-page="${this.state.page + 1}"><i class='bx bx-chevron-left'></i></button>`;
    
    container.innerHTML = html;
    
    container.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.state.page = parseInt(e.currentTarget.dataset.page);
        this.renderTable();
      });
    });
  }

  async openEditor(id = null) {
    this.app.navigate('category-editor');
    document.getElementById('category-id').value = id || '';
    document.getElementById('category-name-ar').value = '';
    document.getElementById('category-status').checked = true;
    document.getElementById('category-image-base64').value = '';
    document.getElementById('category-icon-base64').value = '';
    this.app.ui.getUploader('categoryImage')?.clear();
    this.app.ui.getUploader('categoryIcon')?.clear();

    if (id) {
      const cat = await window.api.categories.getById(parseInt(id));
      if (cat) {
        document.getElementById('category-name-ar').value = cat.name;
        document.getElementById('category-status').checked = (cat.status === 'نشط' || !cat.status);
        if(cat.description) {
          document.getElementById('category-image-base64').value = cat.description;
          this.app.ui.getUploader('categoryImage')?.setImage(cat.description);
        }
        if(cat.icon) {
          document.getElementById('category-icon-base64').value = cat.icon;
          this.app.ui.getUploader('categoryIcon')?.setImage(cat.icon);
        }
      }
    }
  }

  async cancel() {
    if (this.app.isDirty) {
      const confirmed = await window.ui.confirm('تأكيد', 'هل أنت متأكد من إلغاء التغييرات والعودة؟');
      if (!confirmed) return;
    }
    this.app.isDirty = false;
    this.app.navigate('categories');
  }

  async save() {
    const name = document.getElementById('category-name-ar').value.trim();
    if (!name) return window.ui.toast('الاسم مطلوب', 'error');

    const catId = document.getElementById('category-id').value ? parseInt(document.getElementById('category-id').value) : null;
    let existing = null;
    if (catId) {
      existing = await window.api.categories.getById(catId);
    }

    await window.api.categories.save({
      id: catId,
      name: name,
      status: document.getElementById('category-status').checked ? 'نشط' : 'مخفي',
      description: document.getElementById('category-image-base64').value,
      icon: document.getElementById('category-icon-base64').value,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    window.ui.toast('تم الحفظ', 'success');
    this.app.isDirty = false;
    this.app.refreshAll();
    this.app.navigate('categories');
  }

  async openDetails(id) {
    const cat = await window.api.categories.getById(parseInt(id));
    if(!cat) return;
    this.app.navigate('category-details');
    document.getElementById('cat-details-title').textContent = `ألعاب قسم: ${cat.name}`;
    
    const catGames = await window.api.games.getGames({ category_id: cat.id });
    const tbody = document.getElementById('cat-details-games-tbody');
    if(tbody) {
      tbody.innerHTML = catGames.map(g => `
        <tr class="draggable" data-id="${g.id}">
          <td><i class='bx bx-move' style="cursor:move; color:var(--text-muted);"></i></td>
          <td><div style="display:flex;align-items:center;gap:12px;"><img src="${g.image || g.image_url || 'assets/placeholder.svg'}" style="width:40px;border-radius:8px;object-fit:cover;">${g.title || g.name}</div></td>
          <td><span class="badge ${g.status==='نشط'?'badge-success':'badge-secondary'}">${g.status}</span></td>
          <td><button class="btn-icon btn-edit-game" data-id="${g.id}"><i class='bx bx-edit'></i></button></td>
        </tr>
      `).join('');
      this.app.ui.initDragAndDrop(tbody, async (ids) => {
        for (let i = 0; i < ids.length; i++) {
          const g = await window.api.games.getById(ids[i]);
          if (g) {
            g.sort_order = i;
            await window.api.games.save(g);
          }
        }
      });
    }
  }

  async delete(id) {
    if(await window.ui.confirm('حذف قسم', 'هل أنت متأكد من حذف القسم؟ سيتم إلغاء تصنيف الألعاب المرتبطة به.')) {
      const cat = await window.api.categories.getById(parseInt(id));
      if (cat) {
        const games = await window.api.games.getGames({ category_id: cat.id });
        for (let g of games) {
          g.category_id = null;
          await window.api.games.save(g);
        }
      }
      await window.api.categories.delete(parseInt(id));
      window.ui.toast('تم الحذف بنجاح', 'success');
      this.app.refreshAll();
    }
  }

  async applyBulkAction() {
    const action = document.getElementById('categories-bulk-action').value;
    const selected = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => parseInt(cb.value));
    
    if(!action || selected.length === 0) return window.ui.toast('اختر إجراء وعناصر أولاً', 'error');
    if(!await window.ui.confirm('تأكيد', 'تنفيذ الإجراء الجماعي؟')) return;

    if(action === 'delete') {
      for (let id of selected) {
        const cat = await window.api.categories.getById(id);
        if (cat) {
          const games = await window.api.games.getGames({ category_id: cat.id });
          for (let g of games) {
            g.category_id = null;
            await window.api.games.save(g);
          }
        }
      }
      await window.api.categories.bulkDelete(selected);
      window.ui.toast('تم الحذف الجماعي', 'success');
    } else if(action === 'status_active' || action === 'status_hidden') {
      const status = action === 'status_active' ? 'نشط' : 'مخفي';
      for(let id of selected) {
        const cat = await window.api.categories.getById(id);
        if(cat) {
          cat.status = status;
          await window.api.categories.save(cat);
        }
      }
      window.ui.toast('تم تحديث الحالة', 'success');
    }
    document.getElementById('categories-select-all').checked = false;
    this.app.refreshAll();
  }
}
window.CategoriesManager = CategoriesManager;
