const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../database/database');
const { SECRET_KEY } = require('../middleware/auth');

// ── POST /api/login ───────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'admin_profile'");
    if (!row) return res.status(401).json({ success: false, message: 'No admin configured' });

    const admin = JSON.parse(row.value);

    if (admin.username !== username) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Update last_login timestamp
    admin.last_login = new Date().toISOString();
    await db.run('UPDATE settings SET value = ? WHERE key = ?', [JSON.stringify(admin), 'admin_profile']);

    const token = jwt.sign({ username: admin.username, role: admin.role }, SECRET_KEY, { expiresIn: '30d' });

    // Log activity
    await db.run(
      'INSERT INTO activity_logs (admin_id, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?)',
      [1, 'login', 'system', 'Admin logged in', new Date().toISOString()]
    );

    res.json({
      success: true,
      token,
      user: {
        id:         1,
        name:       admin.name,
        username:   admin.username,
        email:      admin.email,
        role:       admin.role,
        avatar:     admin.avatar,
        last_login: admin.last_login,
        created_at: admin.created_at || null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/logout ──────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await db.run(
      'INSERT INTO activity_logs (admin_id, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?)',
      [1, 'logout', 'system', 'Admin logged out', new Date().toISOString()]
    );
  } catch (_) { /* non-critical */ }
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── GET /api/profile ──────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'admin_profile'");
    if (!row) return res.status(404).json({ success: false, message: 'Profile not found' });

    const admin = JSON.parse(row.value);
    const safeAdmin = {
      name:       admin.name,
      username:   admin.username,
      email:      admin.email,
      role:       admin.role,
      avatar:     admin.avatar,
      last_login: admin.last_login || null,
      created_at: admin.created_at || null
    };
    res.json({ success: true, data: safeAdmin });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PUT /api/profile ──────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name, username, email, avatar, role } = req.body;
  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'admin_profile'");
    if (!row) return res.status(404).json({ success: false, message: 'Profile not found' });

    let admin = JSON.parse(row.value);

    if (name)     admin.name     = name.trim();
    if (username) admin.username = username.trim();
    if (email)    admin.email    = email.trim();
    if (role)     admin.role     = role.trim();
    if (avatar !== undefined) admin.avatar = avatar;

    await db.run('UPDATE settings SET value = ? WHERE key = ?', [JSON.stringify(admin), 'admin_profile']);

    await db.run(
      'INSERT INTO activity_logs (admin_id, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?)',
      [1, 'update_profile', 'admin', 'Profile updated', new Date().toISOString()]
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /api/change-password ─────────────────────────────────────────────────
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const row = await db.get("SELECT value FROM settings WHERE key = 'admin_profile'");
    if (!row) return res.status(404).json({ success: false, message: 'Profile not found' });

    const admin = JSON.parse(row.value);

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE settings SET value = ? WHERE key = ?', [JSON.stringify(admin), 'admin_profile']);

    await db.run(
      'INSERT INTO activity_logs (admin_id, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?)',
      [1, 'change_password', 'admin', 'Password changed', new Date().toISOString()]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { login, logout, getProfile, updateProfile, changePassword };
