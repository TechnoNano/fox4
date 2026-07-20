class AuthService {
  constructor() {
    this.API_URL = 'http://localhost:3000/api';
  }

  async login(username, password, rememberMe = false) {
    if (!username || !password) {
      throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
    }

    try {
      const response = await fetch(`${this.API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }

      const data = await response.json();
      
      // Defensive null check
      if (!data || !data.success) {
        throw new Error(data?.message || 'فشل تسجيل الدخول');
      }
      
      const expiration = rememberMe ? Date.now() + 30 * 24 * 60 * 60 * 1000 : Date.now() + 24 * 60 * 60 * 1000;
      const tokenObj = { token: data.token, expires: expiration };
      
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('admin_token', JSON.stringify(tokenObj));
      localStorage.setItem('admin_authenticated', 'true');
      
      // Add defensive null checks for user object
      if (data.user) {
        localStorage.setItem('admin_name', data.user.name || 'Admin');
        localStorage.setItem('admin_role', data.user.role || '');
        localStorage.setItem('admin_email', data.user.email || '');
        localStorage.setItem('admin_avatar', data.user.avatar || '');
      }
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  logout() {
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_token');
    localStorage.removeItem('admin_authenticated');
  }

  isAuthenticated() {
    const checkToken = (storage) => {
      const item = storage.getItem('admin_token');
      if (!item) return false;
      try {
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expires) {
          storage.removeItem('admin_token');
          return false;
        }
        return true;
      } catch (e) {
        return true;
      }
    };
    
    return checkToken(localStorage) || checkToken(sessionStorage);
  }

  getToken() {
    const item = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (!item) return null;
    try {
      return JSON.parse(item).token;
    } catch(e) {
      return item;
    }
  }
}

window.auth = new AuthService();
