/**
 * Data Repositories - API client layer for CMS frontend
 * All repositories talk to the backend REST API.
 */

const API_BASE = 'http://localhost:3000/api';

// ── Base helpers ──────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = window.auth?.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg = json.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data !== undefined ? json.data : json;
}

// ── Base CRUD Repository ──────────────────────────────────────────────────────
class BaseRepository {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.base = `${API_BASE}/${endpoint}`;
  }

  async getAll(params = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiFetch(`${this.base}${qs}`);
  }

  async getById(id) {
    return apiFetch(`${this.base}/${id}`);
  }

  async save(data) {
    if (data.id) {
      return apiFetch(`${this.base}/${data.id}`, {
        method:  'PUT',
        body:    JSON.stringify(data)
      });
    }
    return apiFetch(this.base, {
      method: 'POST',
      body:   JSON.stringify(data)
    });
  }

  async delete(id) {
    return apiFetch(`${this.base}/${id}`, { method: 'DELETE' });
  }
}

// ── Games Repository ──────────────────────────────────────────────────────────
class GameRepository extends BaseRepository {
  constructor() { super('games'); }

  async getGames(params = {}) { return this.getAll(params); }

  async bulkDelete(ids) {
    for (const id of ids) await this.delete(id);
  }

  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      const game = await this.getById(orderedIds[i]);
      if (game) await this.save({ ...game, sort_order: i });
    }
  }
}

// ── Categories Repository ─────────────────────────────────────────────────────
class CategoryRepository extends BaseRepository {
  constructor() { super('categories'); }

  async getCategories(params = {}) { return this.getAll(params); }

  async bulkDelete(ids) {
    for (const id of ids) await this.delete(id);
  }

  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      const cat = await this.getById(orderedIds[i]);
      if (cat) await this.save({ ...cat, sort_order: i });
    }
  }
}

// ── Banners Repository ────────────────────────────────────────────────────────
class BannerRepository extends BaseRepository {
  constructor() { super('banners'); }

  async getBanners(params = {}) { return this.getAll(params); }

  async bulkDelete(ids) {
    for (const id of ids) await this.delete(id);
  }

  async reorder(orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
      const b = await this.getById(orderedIds[i]);
      if (b) await this.save({ ...b, displayOrder: i });
    }
  }
}

// ── Admin Repository ──────────────────────────────────────────────────────────
class AdminRepository {
  async getProfile() {
    return apiFetch(`${API_BASE}/profile`);
  }

  async saveProfile(data) {
    return apiFetch(`${API_BASE}/profile`, {
      method: 'PUT',
      body:   JSON.stringify(data)
    });
  }

  async changePassword(currentPassword, newPassword) {
    return apiFetch(`${API_BASE}/change-password`, {
      method: 'POST',
      body:   JSON.stringify({ currentPassword, newPassword })
    });
  }
}

// ── Settings Repository ───────────────────────────────────────────────────────
class SettingsRepository {
  async getSettings() {
    try {
      return await apiFetch(`${API_BASE}/settings`);
    } catch (_) {
      return {};
    }
  }

  async saveSettings(data) {
    return apiFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      body:   JSON.stringify(data)
    });
  }
}

// ── Analytics Repository ──────────────────────────────────────────────────────
class AnalyticsRepository {
  async getDashboardData() {
    return apiFetch(`${API_BASE}/analytics/dashboard`);
  }

  async recordEvent(eventType, data = {}) {
    return apiFetch(`${API_BASE}/analytics/${eventType}`, {
      method: 'POST',
      body:   JSON.stringify(data)
    });
  }
}

// ── Upload Repository ─────────────────────────────────────────────────────────
class UploadRepository {
  async upload(file, type = 'games') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const token = window.auth?.getToken();
    const res = await fetch(`${API_BASE}/upload?type=${type}`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || 'Upload failed');
    return json.data;
  }

  async deleteFile(filePath) {
    return apiFetch(`${API_BASE}/upload`, {
      method: 'DELETE',
      body:   JSON.stringify({ filePath })
    });
  }
}

// ── Initialize global api object ──────────────────────────────────────────────
window.api = {
  dbReady: false,

  init: async function () {
    this.games      = new GameRepository();
    this.categories = new CategoryRepository();
    this.banners    = new BannerRepository();
    this.admin      = new AdminRepository();
    this.settings   = new SettingsRepository();
    this.analytics  = new AnalyticsRepository();
    this.upload     = new UploadRepository();
    this.dbReady    = true;
  }
};
