class BannersManager {
  constructor(app) {
    this.app = app;
    this.state = { search: '' };
    this.bindEvents();
    setTimeout(() => this.app.ui.initUploader('banner-image-uploader-editor', 'banner-image-base64', 'bannerImage'), 100);
  }

  bindEvents() {
    document.getElementById('btn-add-banner')?.addEventListener('click', () => this.openEditor());
    document.getElementById('btn-save-banner')?.addEventListener('click', () => this.save());
    document.getElementById('btn-cancel-banner')?.addEventListener('click', () => this.cancel());

    document.getElementById('banners-search')?.addEventListener('input', (e) => {
      this.state.search = e.target.value.toLowerCase();
      this.renderTable();
    });

    document.getElementById('banners-select-all')?.addEventListener('change', (e) => {
      document.querySelectorAll('.banner-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btn-apply-bulk-banners')?.addEventListener('click', () => this.applyBulkAction());

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-banner');
      const delBtn = e.target.closest('.btn-delete-banner');
      if(editBtn) this.openEditor(editBtn.dataset.id);
      if(delBtn) this.delete(delBtn.dataset.id);
    });

    // Preview Logic
    document.getElementById('btn-preview-banner')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.app.preview.showPreview('banner');
    });

    const liveFields = ['banner-title', 'banner-subtitle', 'banner-url', 'banner-label', 'banner-status', 'banner-image-base64', 'banner-image-url'];
    liveFields.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.app.preview.updateBannerPreview());
      document.getElementById(id)?.addEventListener('change', () => this.app.preview.updateBannerPreview());
    });
    
    document.getElementById('banner-image-url')?.addEventListener('change', (e) => {
      const url = e.target.value.trim();
      if(url) {
        const img = new Image();
        img.onload = () => {
          document.getElementById('banner-image-base64').value = '';
          this.app.ui.getUploader('bannerImage')?.setImage(url);
          this.app.preview.updateBannerPreview();
        };
        img.onerror = () => window.ui.toast('رابط الصورة غير صالح', 'error');
        img.src = url;
      }
    });
  }



  async renderTable() {
    const tbody = document.getElementById('banners-table-tbody');
    if(!tbody) return;

    window.ui.showSkeleton(tbody, 3, 6);

    let banners = await window.api.banners.getBanners();
    
    if (this.state.search) {
      banners = banners.filter(b => b.title.toLowerCase().includes(this.state.search) || b.subtitle?.toLowerCase().includes(this.state.search));
    }

    if(banners.length === 0) {
       tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا يوجد بنرات مطابقة.</td></tr>`;
       return;
    }

    tbody.innerHTML = banners.map(b => `
      <tr data-id="${b.id}">
        <td><input type="checkbox" class="banner-checkbox" value="${b.id}"></td>
        <td>
          <img src="${b.image || 'assets/placeholder.svg'}" style="width:100px;height:50px;border-radius:4px;object-fit:cover;" onerror="this.src='assets/placeholder.svg'">
        </td>
        <td style="font-weight: 500;">${b.title}</td>
        <td>${b.subtitle || '-'}</td>
        <td><span class="badge ${b.status==='نشط'?'badge-success':'badge-secondary'}">${b.status || 'نشط'}</span></td>
        <td>
          <button class="btn-icon btn-edit-banner" data-id="${b.id}"><i class='bx bx-edit'></i></button>
          <button class="btn-icon btn-delete-banner" data-id="${b.id}" style="color: var(--danger)"><i class='bx bx-trash'></i></button>
        </td>
      </tr>
    `).join('');

    this.app.ui.initDragAndDrop(tbody, async (ids) => {
      await window.api.banners.reorder(ids);
      this.app.refreshAll();
    });
  }

  async openEditor(id = null) {
    this.app.navigate('banner-editor');
    document.getElementById('banner-id').value = id || '';
    document.getElementById('banner-title').value = '';
    document.getElementById('banner-subtitle').value = '';
    document.getElementById('banner-url').value = '';
    document.getElementById('banner-label').value = 'normal';
    document.getElementById('banner-status').checked = true;
    document.getElementById('banner-image-base64').value = '';
    document.getElementById('banner-image-url').value = '';
    this.app.ui.getUploader('bannerImage')?.clear();

    if (id) {
      const b = await window.api.banners.getById(parseInt(id));
      if (b) {
        document.getElementById('banner-title').value = b.title || '';
        document.getElementById('banner-subtitle').value = b.subtitle || '';
        // Use gameUrl field (consistent with DB schema)
        document.getElementById('banner-url').value = b.gameUrl || b.url || '';
        document.getElementById('banner-label').value = b.label || 'normal';
        document.getElementById('banner-status').checked = (b.status === 'نشط' || !b.status);
        if(b.image) {
          if (b.image.startsWith('data:image')) {
            document.getElementById('banner-image-base64').value = b.image;
          } else {
            document.getElementById('banner-image-url').value = b.image;
          }
          this.app.ui.getUploader('bannerImage')?.setImage(b.image);
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
    this.app.navigate('banners');
  }

  async save() {
    const title = document.getElementById('banner-title').value.trim();
    if (!title) return window.ui.toast('العنوان مطلوب', 'error');

    const imageBase64 = document.getElementById('banner-image-base64').value;
    const imageUrl = document.getElementById('banner-image-url').value.trim();
    const image = imageBase64 || imageUrl;
    
    const idVal = document.getElementById('banner-id').value;
    const existing = idVal ? await window.api.banners.getById(parseInt(idVal)) : null;

    const data = {
      id: idVal ? parseInt(idVal) : null,
      title,
      subtitle: document.getElementById('banner-subtitle').value,
      gameUrl: document.getElementById('banner-url').value,
      label: document.getElementById('banner-label').value,
      status: document.getElementById('banner-status').checked ? 'نشط' : 'مخفي',
      image: image
    };

    await window.api.banners.save(data);

    window.ui.toast('تم الحفظ', 'success');
    this.app.isDirty = false;
    this.app.refreshAll();
    this.app.navigate('banners');
  }

  async delete(id) {
    if(await window.ui.confirm('حذف بنر', 'تأكيد حذف هذا البنر؟')) {
      await window.api.banners.delete(parseFloat(id));
      window.ui.toast('تم الحذف', 'success');
      this.app.refreshAll();
    }
  }

  async applyBulkAction() {
    const action = document.getElementById('banners-bulk-action').value;
    const selected = Array.from(document.querySelectorAll('.banner-checkbox:checked')).map(cb => parseFloat(cb.value));
    
    if(!action || selected.length === 0) return window.ui.toast('اختر إجراء وعناصر أولاً', 'error');
    if(!await window.ui.confirm('تأكيد', 'تنفيذ الإجراء الجماعي؟')) return;

    if(action === 'delete') {
      await window.api.banners.bulkDelete(selected);
      window.ui.toast('تم الحذف الجماعي', 'success');
    } else if(action === 'status_active' || action === 'status_hidden') {
      const status = action === 'status_active' ? 'نشط' : 'مخفي';
      for(let id of selected) {
        const item = await window.api.banners.getById(id);
        if(item) {
          item.status = status;
          await window.api.banners.save(item);
        }
      }
      window.ui.toast('تم تحديث الحالة', 'success');
    }
    document.getElementById('banners-select-all').checked = false;
    this.app.refreshAll();
  }
}
window.BannersManager = BannersManager;
