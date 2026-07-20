const db   = require('../database/database');
const path = require('path');
const fs   = require('fs');

// ── GET /api/banners ──────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT b.*,
             COALESCE(bs.clicks, 0) as total_clicks,
             COALESCE(bs.views,  0) as total_views
      FROM banners b
      LEFT JOIN banner_statistics bs ON bs.banner_id = b.id
      WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND b.status = ?'; params.push(status); }
    sql += ' ORDER BY COALESCE(b.displayOrder, 0) ASC, b.id DESC';

    const data = await db.all(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    console.error('banners.getAll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/banners/:id ──────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const data = await db.get('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!data) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('banners.getById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/banners ─────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      title, subtitle = '', image = '', gameUrl = '',
      label = 'normal', status = 'نشط', displayOrder = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Banner title is required' });
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO banners (title, subtitle, image, gameUrl, label, status, displayOrder, click_count, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [title.trim(), subtitle, image, gameUrl, label, status, displayOrder, now, now]
    );

    const created = await db.get('SELECT * FROM banners WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, message: 'Banner created successfully', data: created });
  } catch (err) {
    console.error('banners.create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/banners/:id ──────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Banner not found' });

    const {
      title        = existing.title,
      subtitle     = existing.subtitle,
      image        = existing.image,
      gameUrl      = existing.gameUrl,
      label        = existing.label,
      status       = existing.status,
      displayOrder = existing.displayOrder
    } = req.body;

    const now = new Date().toISOString();
    await db.run(
      `UPDATE banners SET title = ?, subtitle = ?, image = ?, gameUrl = ?,
       label = ?, status = ?, displayOrder = ?, updatedAt = ? WHERE id = ?`,
      [title, subtitle, image, gameUrl, label, status, displayOrder, now, req.params.id]
    );

    const updated = await db.get('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Banner updated successfully', data: updated });
  } catch (err) {
    console.error('banners.update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/banners/:id ───────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Banner not found' });

    if (existing.image && existing.image.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', existing.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.run('DELETE FROM banners WHERE id = ?', [req.params.id]);
    await db.run('DELETE FROM banner_statistics WHERE banner_id = ?', [req.params.id]);

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (err) {
    console.error('banners.remove error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
