/**
 * UI Utilities: Toasts, Modals, Skeleton Loaders
 */

class UIUtils {
  constructor() {
    this.setupContainers();
  }

  setupContainers() {
    // Toast Container
    if (!document.getElementById('toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'toast-container';
      tc.className = 'toast-container';
      document.body.appendChild(tc);
    }
    
    // Modal Container
    if (!document.getElementById('modal-overlay')) {
      const mo = document.createElement('div');
      mo.id = 'modal-overlay';
      mo.className = 'modal-overlay hidden';
      
      const mc = document.createElement('div');
      mc.id = 'modal-content';
      mc.className = 'modal-content card';
      
      mo.appendChild(mc);
      document.body.appendChild(mo);
      
      // Close modal on overlay click
      mo.addEventListener('click', (e) => {
        if(e.target === mo) this.closeModal();
      });
    }
  }

  /**
   * Show Toast Notification
   * @param {string} message 
   * @param {string} type 'success' | 'error' | 'info'
   */
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'bx-check-circle';
    if(type === 'error') icon = 'bx-error-circle';
    if(type === 'info') icon = 'bx-info-circle';

    toast.innerHTML = `
      <i class='bx ${icon}'></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Custom Confirmation Modal
   * @param {string} title 
   * @param {string} message 
   * @returns {Promise<boolean>}
   */
  async confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('modal-content');
      
      content.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
          <button class="btn btn-secondary" id="modal-cancel">إلغاء</button>
          <button class="btn btn-danger" id="modal-confirm">تأكيد</button>
        </div>
      `;
      
      overlay.classList.remove('hidden');
      setTimeout(() => content.classList.add('show'), 10);

      const close = (result) => {
        content.classList.remove('show');
        setTimeout(() => {
          overlay.classList.add('hidden');
          resolve(result);
        }, 200);
      };

      document.getElementById('modal-cancel').onclick = () => close(false);
      document.getElementById('modal-confirm').onclick = () => close(true);
    });
  }

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if(overlay && !overlay.classList.contains('hidden')) {
      content.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 200);
    }
  }

  /**
   * Show Skeleton Loader in a table body
   * @param {HTMLElement} tbodyElement 
   * @param {number} rows 
   * @param {number} cols 
   */
  showSkeleton(tbodyElement, rows = 5, cols = 6) {
    if(!tbodyElement) return;
    let html = '';
    for(let i=0; i<rows; i++) {
      html += '<tr>';
      for(let j=0; j<cols; j++) {
        html += `<td><div class="skeleton skeleton-text"></div></td>`;
      }
      html += '</tr>';
    }
    tbodyElement.innerHTML = html;
  }
}

window.ui = new UIUtils();
