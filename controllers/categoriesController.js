const db   = require('../database/database');
const path = require('path');
const fs   = require('fs');

// ── GET /api/categories ───────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT c.*, (SELECT COUNT(*) FROM games WHERE category_id = c.id) as game_count FROM categories c WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    sql += ' ORDER BY COALESCE(c.sort_order, 0) ASC, c.id ASC';

    const data = await db.all(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    console.error('categories.getAll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/categories/:id ───────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const data = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!data) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('categories.getById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/categories ──────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, description = '', icon = '', color = '', status = 'نشط', sort_order = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await db.get('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing) return res.status(400).json({ success: false, message: 'Category already exists' });

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO categories (name, description, icon, color, status, sort_order, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description, icon, color, status, sort_order, now, now]
    );

    const created = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, message: 'Category created successfully', data: created });
  } catch (err) {
    console.error('categories.create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/categories/:id ───────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });

    const {
      name        = existing.name,
      description = existing.description,
      icon        = existing.icon,
      color       = existing.color,
      status      = existing.status,
      sort_order  = existing.sort_order
    } = req.body;

    if (name && name.trim() !== existing.name) {
      const dup = await db.get('SELECT id FROM categories WHERE name = ? AND id != ?', [name.trim(), req.params.id]);
      if (dup) return res.status(400).json({ success: false, message: 'Category name already exists' });
    }

    const now = new Date().toISOString();
    await db.run(
      `UPDATE categories SET name = ?, description = ?, icon = ?, color = ?, status = ?, sort_order = ?, updatedAt = ?
       WHERE id = ?`,
      [name.trim(), description, icon, color, status, sort_order, now, req.params.id]
    );

    const updated = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Category updated successfully', data: updated });
  } catch (err) {
    console.error('categories.update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/categories/:id ────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });

    // Check if any games use this category
    const gameCount = await db.get('SELECT COUNT(*) as c FROM games WHERE category_id = ?', [req.params.id]);
    if (gameCount?.c > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${gameCount.c} game(s) are using this category`
      });
    }

    // Delete icon file if local
    if (existing.icon && existing.icon.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', existing.icon);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('categories.remove error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
