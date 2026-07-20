const db = require('../database/database');

// Keys that should never be exposed publicly
const PRIVATE_KEYS = new Set(['admin_profile']);

// ── GET /api/settings ─────────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM settings');
    const settingsObj = {};
    rows.forEach(r => {
      if (!PRIVATE_KEYS.has(r.key)) {
        settingsObj[r.key] = r.value;
      }
    });
    res.json({ success: true, data: settingsObj });
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/settings ─────────────────────────────────────────────────────────
const updateSettings = async (req, res) => {
  const keys = Object.keys(req.body).filter(k => !PRIVATE_KEYS.has(k));

  if (keys.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid settings provided' });
  }

  try {
    for (const k of keys) {
      await db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [k, req.body[k]]
      );
    }
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSettings, updateSettings };
