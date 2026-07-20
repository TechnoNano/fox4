const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../cms.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys=ON');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // ── Settings (Key-Value) ──────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )`);

    // ── Games ────────────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS games (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT,
      category_id INTEGER,
      image       TEXT,
      image_url   TEXT,
      game_url    TEXT,
      banner_url  TEXT,
      featured    INTEGER DEFAULT 0,
      popular     INTEGER DEFAULT 0,
      recommended INTEGER DEFAULT 0,
      new_game    INTEGER DEFAULT 0,
      status      TEXT    DEFAULT 'نشط',
      sort_order  INTEGER DEFAULT 0,
      views       INTEGER DEFAULT 0,
      created_at  TEXT,
      updated_at  TEXT
    )`);

    // Add missing columns to games (safe ALTER, ignored if already exists)
    db.run(`ALTER TABLE games ADD COLUMN views INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE games ADD COLUMN banner_url TEXT`, () => {});

    // ── Categories ───────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      icon        TEXT,
      color       TEXT,
      status      TEXT    DEFAULT 'نشط',
      sort_order  INTEGER DEFAULT 0,
      createdAt   TEXT,
      updatedAt   TEXT
    )`);

    db.run(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`, () => {});

    // ── Banners ──────────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS banners (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT,
      subtitle     TEXT,
      image        TEXT,
      gameUrl      TEXT,
      label        TEXT    DEFAULT 'normal',
      status       TEXT    DEFAULT 'نشط',
      displayOrder INTEGER DEFAULT 0,
      click_count  INTEGER DEFAULT 0,
      createdAt    TEXT,
      updatedAt    TEXT
    )`);

    db.run(`ALTER TABLE banners ADD COLUMN click_count INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE banners ADD COLUMN label TEXT DEFAULT 'normal'`, () => {});

    // ── Analytics Events ─────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id    TEXT,
      game_id    INTEGER,
      banner_id  INTEGER,
      duration   INTEGER,
      timestamp  TEXT NOT NULL
    )`);

    // ── Game Statistics ──────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS game_statistics (
      game_id          INTEGER PRIMARY KEY,
      play_count       INTEGER DEFAULT 0,
      unique_players   INTEGER DEFAULT 0,
      last_played      TEXT,
      average_duration INTEGER DEFAULT 0,
      favorite_count   INTEGER DEFAULT 0
    )`);

    // ── Banner Statistics ────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS banner_statistics (
      banner_id  INTEGER PRIMARY KEY,
      views      INTEGER DEFAULT 0,
      clicks     INTEGER DEFAULT 0,
      last_click TEXT
    )`);

    // ── Daily Statistics ─────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS daily_statistics (
      date         TEXT PRIMARY KEY,
      active_users INTEGER DEFAULT 0,
      new_users    INTEGER DEFAULT 0,
      app_opens    INTEGER DEFAULT 0,
      game_plays   INTEGER DEFAULT 0
    )`);

    // ── Activity Logs ────────────────────────────────────────────────────────────
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id  INTEGER,
      action    TEXT,
      target    TEXT,
      details   TEXT,
      createdAt TEXT
    )`);

    // Add missing columns to activity_logs for existing databases
    db.run(`ALTER TABLE activity_logs ADD COLUMN details TEXT`, () => {});

    // ── Indexes ──────────────────────────────────────────────────────────────
    db.run(`CREATE INDEX IF NOT EXISTS idx_games_category ON games(category_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_ts   ON analytics_events(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_time  ON activity_logs(createdAt)`);

    // ── Default Settings ─────────────────────────────────────────────────────
    db.get("SELECT key FROM settings WHERE key = 'appName'", (err, row) => {
      if (!row) {
        const defaultSettings = [
          ['appName',        'CMS Admin'],
          ['appVersion',     '1.0.0'],
          ['logo',           ''],
          ['maintenanceMode','false'],
          ['privacyUrl',     ''],
          ['termsUrl',       ''],
          ['supportEmail',   ''],
          ['supportUrl',     ''],
          ['contactInfo',    ''],
          ['telegram',       ''],
          ['telegramUrl',    ''],
          ['aboutText',      ''],
          ['copyright',      ''],
          ['theme',          'light'],
          ['socialLinks',    '{}']
        ];
        const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
        defaultSettings.forEach(([k, v]) => stmt.run(k, v));
        stmt.finalize();
      }
    });

    // ── Admin Profile (must come after settings table creation) ──────────────
    db.get("SELECT value FROM settings WHERE key = 'admin_profile'", async (err, row) => {
      if (!row) {
        try {
          const hash = await bcrypt.hash('admin123', 10);
          const adminProfile = JSON.stringify({
            username:   'admin',
            password:   hash,
            name:       'Administrator',
            email:      'admin@example.com',
            role:       'Super Admin',
            avatar:     '',
            created_at: new Date().toISOString(),
            last_login: null
          });
          db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['admin_profile', adminProfile]);
          console.log('Default admin account created. Username: admin | Password: admin123');
        } catch (e) {
          console.error('Failed to create admin profile:', e.message);
        }
      }
    });
  });
}

// ── Promisified wrapper ───────────────────────────────────────────────────────
const dbAsync = {
  get: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    }),

  all: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    }),

  run: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this); // { lastID, changes }
      });
    }),

  serialize: (callback) => db.serialize(callback),
  prepare:   (sql)      => db.prepare(sql)
};

module.exports = dbAsync;
