class PreviewManager {
  constructor(app) {
    this.app = app;
    this.closeTimeout = null;
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('preview-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'preview-modal') this.closePreview();
    });

    document.getElementById('btn-close-preview')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.closePreview();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePreview();
    });
  }

  closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal && !modal.classList.contains('hidden')) {
      const content = modal.querySelector('.modal-content');
      if (content) content.classList.remove('show');
      this.closeTimeout = setTimeout(() => modal.classList.add('hidden'), 300);
    }
  }

  showPreview(type) {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    if (type === 'game') {
      this.updateGamePreview();
      document.getElementById('preview-game-container').style.display = 'block';
      document.getElementById('preview-banner-container').style.display = 'none';
      document.getElementById('preview-modal-container').style.width = '350px';
      document.getElementById('preview-modal-header-title').textContent = 'معاينة كبطاقة موبايل';
    } else if (type === 'banner') {
      this.updateBannerPreview();
      document.getElementById('preview-game-container').style.display = 'none';
      document.getElementById('preview-banner-container').style.display = 'block';
      document.getElementById('preview-modal-container').style.width = '600px';
      document.getElementById('preview-modal-header-title').textContent = 'معاينة البنر';
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => modal.querySelector('.modal-content')?.classList.add('show'), 10);
    }
  }

  updateGamePreview() {
    try {
      const nameEl = document.getElementById('game-name');
      const finalName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'اسم اللعبة';

      const descEl = document.getElementById('game-description');
      const description = (descEl && descEl.value.trim()) ? descEl.value.trim() : 'لا يوجد وصف متاح...';

      const orderEl = document.getElementById('game-order');
      const order = (orderEl && orderEl.value) ? orderEl.value : '0';

      const catSelect = document.getElementById('game-category');
      const category = (catSelect && catSelect.options.length > 0 && catSelect.selectedIndex >= 0) 
                        ? catSelect.options[catSelect.selectedIndex].text 
                        : 'غير محدد';

      const badges = [];
      if (document.getElementById('game-featured')?.checked) badges.push({ text: '⭐ مميز', color: '#ffb020' });
      if (document.getElementById('game-popular')?.checked) badges.push({ text: '🔥 شائع', color: '#f04438' });
      if (document.getElementById('game-new_game')?.checked) badges.push({ text: '🆕 جديد', color: '#10b981' });
      if (document.getElementById('game-recommended')?.checked) badges.push({ text: '👍 موصى به', color: '#6366f1' });

      let sectionText = badges.map(b => b.text).join(' - ') || 'عادي';

      const base64Thumb = document.getElementById('game-thumb-base64')?.value;
      const urlThumb = document.getElementById('game-thumb-url')?.value?.trim();
      const localPlaceholder = 'assets/placeholder.svg';
      
      let thumb = localPlaceholder;

      if (base64Thumb && base64Thumb.startsWith('data:image')) {
        thumb = base64Thumb;
      } else if (urlThumb) {
        if (urlThumb.startsWith('http://') || urlThumb.startsWith('https://')) {
          thumb = urlThumb;
        } else if (urlThumb.startsWith('/') || urlThumb.startsWith('./') || urlThumb.startsWith('../') || urlThumb.startsWith('assets/')) {
          // Allow valid relative paths (useful for placeholder/mock data)
          thumb = urlThumb;
        }
      }

      const statusCheckbox = document.getElementById('game-status');
      const isVisible = statusCheckbox ? statusCheckbox.checked : true;

      const titleEl = document.getElementById('preview-modal-title');
      if (titleEl) titleEl.textContent = finalName;

      const descModalEl = document.getElementById('preview-modal-description');
      if (descModalEl) descModalEl.textContent = description;

      const orderModalEl = document.getElementById('preview-modal-order');
      if (orderModalEl) orderModalEl.textContent = order;

      const imgEl = document.getElementById('preview-modal-img');
      if (imgEl) {
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = localPlaceholder;
        };
        if (imgEl.src !== thumb && imgEl.src !== window.location.origin + '/' + thumb) {
          imgEl.src = thumb;
        }
      }
      
      const catEl = document.getElementById('preview-modal-category'); if(catEl) catEl.textContent = category;
      const catEl2 = document.getElementById('preview-modal-category-2'); if(catEl2) catEl2.textContent = category;
      
      const secEl = document.getElementById('preview-modal-section'); if(secEl) secEl.textContent = sectionText;
      const secEl2 = document.getElementById('preview-modal-section-2'); if(secEl2) secEl2.textContent = sectionText;

      const gameUrlEl = document.getElementById('game-url');
      const gameUrl = gameUrlEl ? gameUrlEl.value.trim() : '';
      const playBtn = document.getElementById('preview-play-btn');
      
      let isValidUrl = false;
      if (gameUrl) {
        try {
          new URL(gameUrl, window.location.origin);
          isValidUrl = true;
        } catch (e) {
          isValidUrl = false;
        }
      }

      if (playBtn) {
        if (!gameUrl || !isValidUrl) {
          playBtn.disabled = true;
          playBtn.textContent = 'No Game URL Available';
          playBtn.onclick = null;
        } else {
          playBtn.disabled = false;
          playBtn.textContent = 'العب الآن';
          playBtn.onclick = (e) => {
            e.preventDefault();
            window.open(gameUrl, '_blank');
          };
        }
      }

      const badgesContainer = document.getElementById('preview-modal-badges');
      if (badgesContainer) {
        let badgesHtml = badges.map(b => 
          `<span style="background: ${b.color}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; white-space: nowrap; align-self: flex-end;">${b.text}</span>`
        ).join('');
        
        if (isVisible) {
          badgesHtml += `<div style="background: #10b981; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">مرئي</div>`;
        } else {
          badgesHtml += `<div style="background: #6b7280; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">مخفي</div>`;
        }
        
        badgesContainer.innerHTML = badgesHtml;
      }
    } catch (e) {
      console.error('Error in updateGamePreview:', e);
    }
  }

  updateBannerPreview() {
    try {
      const titleEl = document.getElementById('banner-title');
      const title = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : 'عنوان البنر';

      const subtitleEl = document.getElementById('banner-subtitle');
      const subtitle = (subtitleEl && subtitleEl.value.trim()) ? subtitleEl.value.trim() : 'لا يوجد عنوان فرعي';

      const base64Thumb = document.getElementById('banner-image-base64')?.value;
      const urlThumb = document.getElementById('banner-image-url')?.value;
      const localPlaceholder = 'assets/placeholder.svg';
      let thumb = localPlaceholder;

      if (base64Thumb && base64Thumb.startsWith('data:image')) {
        thumb = base64Thumb;
      } else if (urlThumb) {
        if (urlThumb.startsWith('http://') || urlThumb.startsWith('https://')) {
          thumb = urlThumb;
        } else if (urlThumb.startsWith('/') || urlThumb.startsWith('./') || urlThumb.startsWith('../') || urlThumb.startsWith('assets/')) {
          thumb = urlThumb;
        }
      }

      const statusCheckbox = document.getElementById('banner-status');
      const isVisible = statusCheckbox ? statusCheckbox.checked : true;

      const titleModalEl = document.getElementById('preview-banner-title');
      if (titleModalEl) titleModalEl.textContent = title;

      const subtitleModalEl = document.getElementById('preview-banner-subtitle');
      if (subtitleModalEl) subtitleModalEl.textContent = subtitle;

      const imgEl = document.getElementById('preview-banner-img');
      if (imgEl) {
        imgEl.onerror = function() {
          this.onerror = null;
          this.src = localPlaceholder;
        };
        if (imgEl.src !== thumb && imgEl.src !== window.location.origin + '/' + thumb) {
          imgEl.src = thumb;
        }
      }

      const badgesContainer = document.getElementById('preview-banner-badges');
      if (badgesContainer) {
        let badgesHtml = '';
        
        const labelEl = document.getElementById('banner-label');
        const label = labelEl ? labelEl.value : 'normal';
        if (label === 'new') {
          badgesHtml += `<div style="background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">جديد</div>`;
        } else if (label === 'featured') {
          badgesHtml += `<div style="background: #f59e0b; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">مميز</div>`;
        }

        if (isVisible) {
          badgesHtml += `<div style="background: #10b981; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">مرئي</div>`;
        } else {
          badgesHtml += `<div style="background: #6b7280; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid white;">مخفي</div>`;
        }
        badgesContainer.innerHTML = badgesHtml;
      }
    } catch (e) {
      console.error('Error in updateBannerPreview:', e);
    }
  }

}

window.PreviewManager = PreviewManager;
