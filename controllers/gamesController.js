const db = require('../database/database');
const path = require('path');
const fs   = require('fs');

// ── GET /api/games ────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status, category_id, featured, popular, recommended, new_game, search } = req.query;
    let sql    = 'SELECT g.*, c.name as category_name FROM games g LEFT JOIN categories c ON g.category_id = c.id WHERE 1=1';
    const params = [];

    if (status)      { sql += ' AND g.status = ?';      params.push(status); }
    if (category_id) { sql += ' AND g.category_id = ?'; params.push(Number(category_id)); }
    if (featured  === '1') { sql += ' AND g.featured = 1';   }
    if (popular   === '1') { sql += ' AND g.popular = 1';    }
    if (recommended === '1') { sql += ' AND g.recommended = 1'; }
    if (new_game  === '1') { sql += ' AND g.new_game = 1';  }
    if (search)  { sql += ' AND (g.title LIKE ? OR g.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY g.sort_order ASC, g.id DESC';

    const data = await db.all(sql, params);
    res.json({ success: true, data });
  } catch (err) {
    console.error('games.getAll error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/games/:id ────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const data = await db.get(
      'SELECT g.*, c.name as category_name FROM games g LEFT JOIN categories c ON g.category_id = c.id WHERE g.id = ?',
      [req.params.id]
    );
    if (!data) return res.status(404).json({ success: false, message: 'Game not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('games.getById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/games ───────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      title, description = '', category_id = null,
      image = '', image_url = '', game_url = '', banner_url = '',
      featured = 0, popular = 0, recommended = 0, new_game = 0,
      status = 'نشط', sort_order = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO games
         (title, description, category_id, image, image_url, game_url, banner_url,
          featured, popular, recommended, new_game, status, sort_order, views, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [title.trim(), description, category_id || null, image, image_url, game_url, banner_url,
       featured ? 1 : 0, popular ? 1 : 0, recommended ? 1 : 0, new_game ? 1 : 0,
       status, sort_order, now, now]
    );

    const created = await db.get('SELECT * FROM games WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, message: 'Game created successfully', data: created });
  } catch (err) {
    console.error('games.create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/games/:id ────────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM games WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Game not found' });

    const {
      title       = existing.title,
      description = existing.description,
      category_id = existing.category_id,
      image       = existing.image,
      image_url   = existing.image_url,
      game_url    = existing.game_url,
      banner_url  = existing.banner_url,
      featured    = existing.featured,
      popular     = existing.popular,
      recommended = existing.recommended,
      new_game    = existing.new_game,
      status      = existing.status,
      sort_order  = existing.sort_order
    } = req.body;

    const now = new Date().toISOString();

    await db.run(
      `UPDATE games SET
         title = ?, description = ?, category_id = ?, image = ?, image_url = ?,
         game_url = ?, banner_url = ?,
         featured = ?, popular = ?, recommended = ?, new_game = ?,
         status = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
      [title, description, category_id || null, image, image_url, game_url, banner_url,
       featured ? 1 : 0, popular ? 1 : 0, recommended ? 1 : 0, new_game ? 1 : 0,
       status, sort_order, now, req.params.id]
    );

    const updated = await db.get('SELECT * FROM games WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Game updated successfully', data: updated });
  } catch (err) {
    console.error('games.update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/games/:id ─────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM games WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Game not found' });

    // Delete local image file if stored
    if (existing.image && existing.image.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', existing.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.run('DELETE FROM games WHERE id = ?', [req.params.id]);
    await db.run('DELETE FROM game_statistics WHERE game_id = ?', [req.params.id]);

    res.json({ success: true, message: 'Game deleted successfully' });
  } catch (err) {
    console.error('games.remove error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
