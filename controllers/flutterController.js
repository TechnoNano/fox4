const db = require('../database/database');

// Standard success response helper
const ok  = (res, data, message = '')  => res.json({ success: true, message, data });
const err = (res, e, status = 500)     => res.status(status).json({ success: false, message: e.message || e });

// ── GET /api/flutter/home ─────────────────────────────────────────────────────
// Returns everything the Flutter home screen needs in one request
const getHome = async (req, res) => {
  try {
    const [banners, featured, popular, recommended, newGames, categories] = await Promise.all([
      // Active banners sorted by displayOrder
      db.all(`SELECT id, title, subtitle, image, gameUrl, label, click_count
              FROM banners WHERE status = 'نشط'
              ORDER BY COALESCE(displayOrder, 0) ASC`),

      // Featured games
      db.all(`SELECT g.id, g.title, g.description, g.image, g.image_url, g.game_url,
                     g.banner_url, g.featured, g.popular, g.recommended, g.new_game,
                     g.sort_order, g.views, c.name as category_name, c.id as category_id
              FROM games g
              LEFT JOIN categories c ON g.category_id = c.id
              WHERE g.status = 'نشط' AND g.featured = 1
              ORDER BY g.sort_order ASC LIMIT 20`),

      // Popular games
      db.all(`SELECT g.id, g.title, g.description, g.image, g.image_url, g.game_url,
                     g.banner_url, g.featured, g.popular, g.recommended, g.new_game,
                     g.sort_order, g.views, c.name as category_name, c.id as category_id
              FROM games g
              LEFT JOIN categories c ON g.category_id = c.id
              WHERE g.status = 'نشط' AND g.popular = 1
              ORDER BY g.sort_order ASC LIMIT 20`),

      // Recommended games
      db.all(`SELECT g.id, g.title, g.description, g.image, g.image_url, g.game_url,
                     g.banner_url, g.featured, g.popular, g.recommended, g.new_game,
                     g.sort_order, g.views, c.name as category_name, c.id as category_id
              FROM games g
              LEFT JOIN categories c ON g.category_id = c.id
              WHERE g.status = 'نشط' AND g.recommended = 1
              ORDER BY g.sort_order ASC LIMIT 20`),

      // New games
      db.all(`SELECT g.id, g.title, g.description, g.image, g.image_url, g.game_url,
                     g.banner_url, g.featured, g.popular, g.recommended, g.new_game,
                     g.sort_order, g.views, c.name as category_name, c.id as category_id
              FROM games g
              LEFT JOIN categories c ON g.category_id = c.id
              WHERE g.status = 'نشط' AND g.new_game = 1
              ORDER BY g.sort_order ASC LIMIT 20`),

      // Active categories with game count
      db.all(`SELECT c.id, c.name, c.icon, c.color, c.sort_order,
                     (SELECT COUNT(*) FROM games WHERE category_id = c.id AND status = 'نشط') as game_count
              FROM categories c
              WHERE c.status = 'نشط'
              ORDER BY COALESCE(c.sort_order, 0) ASC`)
    ]);

    ok(res, { banners, featured, popular, recommended, newGames, categories });
  } catch (e) {
    console.error('flutter.getHome error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/games ────────────────────────────────────────────────────
const getGames = async (req, res) => {
  try {
    const {
      category_id, featured, popular, recommended, new_game,
      search, page = 1, limit = 50, status = 'نشط'
    } = req.query;

    let sql    = `SELECT g.*, c.name as category_name
                  FROM games g
                  LEFT JOIN categories c ON g.category_id = c.id
                  WHERE g.status = ?`;
    const params = [status];

    if (category_id)     { sql += ' AND g.category_id = ?';    params.push(Number(category_id)); }
    if (featured === '1'){ sql += ' AND g.featured = 1';   }
    if (popular  === '1'){ sql += ' AND g.popular = 1';    }
    if (recommended === '1'){ sql += ' AND g.recommended = 1'; }
    if (new_game === '1'){ sql += ' AND g.new_game = 1';   }
    if (search)          { sql += ' AND (g.title LIKE ? OR g.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY g.sort_order ASC, g.id DESC';

    // Count total
    const countSql = sql.replace(/SELECT g\.\*, c\.name as category_name/, 'SELECT COUNT(*) as total');
    const countRow = await db.get(countSql, params);
    const total    = countRow?.total || 0;

    // Paginate
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const data = await db.all(sql, params);

    ok(res, { games: data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    console.error('flutter.getGames error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/games/:id ────────────────────────────────────────────────
const getGame = async (req, res) => {
  try {
    const game = await db.get(
      `SELECT g.*, c.name as category_name
       FROM games g
       LEFT JOIN categories c ON g.category_id = c.id
       WHERE g.id = ?`,
      [req.params.id]
    );
    if (!game) return err(res, 'Game not found', 404);
    ok(res, game);
  } catch (e) {
    console.error('flutter.getGame error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/categories ───────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const data = await db.all(`
      SELECT c.id, c.name, c.description, c.icon, c.color, c.sort_order,
             (SELECT COUNT(*) FROM games WHERE category_id = c.id AND status = 'نشط') as game_count
      FROM categories c
      WHERE c.status = 'نشط'
      ORDER BY COALESCE(c.sort_order, 0) ASC, c.id ASC
    `);
    ok(res, data);
  } catch (e) {
    console.error('flutter.getCategories error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/banners ──────────────────────────────────────────────────
const getBanners = async (req, res) => {
  try {
    const data = await db.all(`
      SELECT id, title, subtitle, image, gameUrl, label, click_count, displayOrder
      FROM banners
      WHERE status = 'نشط'
      ORDER BY COALESCE(displayOrder, 0) ASC
    `);
    ok(res, data);
  } catch (e) {
    console.error('flutter.getBanners error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/settings ─────────────────────────────────────────────────
const getSettings = async (req, res) => {
  try {
    const rows = await db.all("SELECT key, value FROM settings WHERE key != 'admin_profile'");
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    ok(res, settings);
  } catch (e) {
    console.error('flutter.getSettings error:', e);
    err(res, e);
  }
};

// ── GET /api/flutter/stats ────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [totalGames, totalCats, totalBanners, topPlayed] = await Promise.all([
      db.get("SELECT COUNT(*) as c FROM games WHERE status = 'نشط'"),
      db.get("SELECT COUNT(*) as c FROM categories WHERE status = 'نشط'"),
      db.get("SELECT COUNT(*) as c FROM banners WHERE status = 'نشط'"),
      db.get(`SELECT g.title, g.image, COALESCE(s.play_count, 0) as plays
              FROM games g
              LEFT JOIN game_statistics s ON s.game_id = g.id
              WHERE g.status = 'نشط'
              ORDER BY COALESCE(s.play_count, 0) DESC LIMIT 1`)
    ]);

    ok(res, {
      totalGames:    totalGames?.c  || 0,
      totalCategories: totalCats?.c || 0,
      totalBanners:  totalBanners?.c || 0,
      topPlayedGame: topPlayed || null
    });
  } catch (e) {
    console.error('flutter.getStats error:', e);
    err(res, e);
  }
};

module.exports = { getHome, getGames, getGame, getCategories, getBanners, getSettings, getStats };
