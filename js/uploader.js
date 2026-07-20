/**
 * Image Uploader Utility
 * Handles Drag & Drop, click-to-upload, Base64 conversion, and validation.
 */

class Uploader {
  /**
   * Initialize an uploader on a specific DOM element.
   * @param {HTMLElement} element The .image-uploader div
   * @param {object} options Options { maxSizeMB, acceptedTypes, onUpload }
   */
  constructor(element, options = {}) {
    if(!element) return;
    this.element = element;
    this.options = Object.assign({
      maxSizeMB: 5,
      acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
      onUpload: null // Callback when base64 is ready
    }, options);
    
    this.base64Data = null;
    this.init();
  }

  init() {
    // Inject hidden file input if not exists
    if(!this.element.querySelector('input[type="file"]')) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = this.options.acceptedTypes.join(',');
      fileInput.style.display = 'none';
      this.element.appendChild(fileInput);
      this.fileInput = fileInput;
    } else {
      this.fileInput = this.element.querySelector('input[type="file"]');
    }

    this.bindEvents();
  }

  bindEvents() {
    // Click to open file dialog
    this.element.addEventListener('click', (e) => {
      if(e.target !== this.fileInput && !e.target.closest('.btn-remove-image')) {
        this.fileInput.click();
      }
    });

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      if(e.target.files && e.target.files[0]) {
        this.processFile(e.target.files[0]);
      }
    });

    // Drag and Drop
    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.element.classList.add('drag-over');
    });

    this.element.addEventListener('dragleave', () => {
      this.element.classList.remove('drag-over');
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.element.classList.remove('drag-over');
      if(e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.processFile(e.dataTransfer.files[0]);
      }
    });
  }

  processFile(file) {
    // Validate Type
    if(!this.options.acceptedTypes.includes(file.type)) {
      if(window.ui) window.ui.toast('صيغة الملف غير مدعومة. يرجى رفع PNG, JPG, أو WEBP', 'error');
      else alert('صيغة الملف غير مدعومة.');
      return;
    }

    // Validate Size
    const sizeMB = file.size / (1024 * 1024);
    if(sizeMB > this.options.maxSizeMB) {
      if(window.ui) window.ui.toast(`حجم الملف كبير جداً. الحد الأقصى ${this.options.maxSizeMB}MB`, 'error');
      else alert('حجم الملف كبير جداً.');
      return;
    }

    // Read file and convert to Base64
    const reader = new FileReader();
    
    // Simulate progress
    this.showProgress();

    reader.onload = (e) => {
      this.base64Data = e.target.result;
      setTimeout(() => {
        this.showPreview(this.base64Data);
        if(this.options.onUpload) this.options.onUpload(this.base64Data);
        if(window.ui) window.ui.toast('تم رفع الصورة بنجاح!', 'success');
      }, 500); // Fake delay for UX
    };
    reader.readAsDataURL(file);
  }

  showProgress() {
    this.element.innerHTML = `
      <div class="upload-progress">
        <i class='bx bx-loader-alt bx-spin' style='font-size: 32px; color: var(--primary);'></i>
        <p style="margin-top: 12px; color: var(--text-muted);">جاري الرفع...</p>
      </div>
    `;
    this.element.appendChild(this.fileInput);
  }

  showPreview(src) {
    this.element.innerHTML = `
      <div class="image-preview-container" style="position: relative; width: 100%; height: 100%; min-height: 150px; display: flex; align-items: center; justify-content: center;">
        <img src="${src}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-md); object-fit: contain;">
        <button class="btn-icon btn-remove-image" style="position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.9); box-shadow: var(--shadow-sm); z-index: 10;" title="حذف الصورة">
          <i class='bx bx-trash' style="color: var(--danger);"></i>
        </button>
      </div>
    `;
    this.element.appendChild(this.fileInput);
    this.element.style.padding = '12px';

    const removeBtn = this.element.querySelector('.btn-remove-image');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent clicking the uploader
      this.clear();
    });
  }

  clear() {
    this.base64Data = null;
    this.fileInput.value = '';
    this.element.style.padding = '40px';
    // Reset to default UI
    this.element.innerHTML = `
      <i class='bx bx-cloud-upload'></i>
      <p>انقر أو اسحب الصورة هنا</p>
      <p style="font-size: 12px; margin-top: 4px;">المقاس الموصى به: 512x512</p>
    `;
    this.element.appendChild(this.fileInput);
    if(this.options.onUpload) this.options.onUpload(null);
  }

  // Load an existing image (e.g. when editing)
  setImage(src) {
    if(src && src !== '') {
      this.base64Data = src;
      this.showPreview(src);
    } else {
      this.clear();
    }
  }

  getData() {
    return this.base64Data;
  }
}
window.Uploader = Uploader;
