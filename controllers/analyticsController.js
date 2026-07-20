const db = require('../database/database');

// ── Helper: upsert daily stats ────────────────────────────────────────────────
async function updateDailyStats(date, field) {
  await db.run(
    `INSERT INTO daily_statistics (date, ${field}) VALUES (?, 1)
     ON CONFLICT(date) DO UPDATE SET ${field} = ${field} + 1`,
    [date]
  );
}

// ── Helper: upsert active_users ───────────────────────────────────────────────
async function updateActiveUser(date, userId) {
  // We track unique users by counting distinct user_id events per day
  // This is a best-effort increment on first event of the day per user
  if (!userId) return;
  const existing = await db.get(
    `SELECT id FROM analytics_events
     WHERE user_id = ? AND timestamp LIKE ? LIMIT 1`,
    [userId, `${date}%`]
  );
  if (!existing) {
    // First event for this user today
    await db.run(
      `INSERT INTO daily_statistics (date, active_users) VALUES (?, 1)
       ON CONFLICT(date) DO UPDATE SET active_users = active_users + 1`,
      [date]
    );
  }
}

// ── Record any event ──────────────────────────────────────────────────────────
const recordEvent = async (req, res, eventType) => {
  const { user_id, game_id, banner_id, duration } = req.body;
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  try {
    // Insert event
    await db.run(
      `INSERT INTO analytics_events (event_type, user_id, game_id, banner_id, duration, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eventType, user_id || null, game_id || null, banner_id || null, duration || null, timestamp]
    );

    // Track active user
    await updateActiveUser(date, user_id);

    if (eventType === 'app-open') {
      await updateDailyStats(date, 'app_opens');

    } else if (eventType === 'game-start') {
      await updateDailyStats(date, 'game_plays');
      if (game_id) {
        await db.run(
          `INSERT INTO game_statistics (game_id, play_count, last_played)
           VALUES (?, 1, ?)
           ON CONFLICT(game_id) DO UPDATE SET
             play_count  = play_count + 1,
             last_played = ?`,
          [game_id, timestamp, timestamp]
        );
        // Increment views on game record
        await db.run(`UPDATE games SET views = COALESCE(views, 0) + 1 WHERE id = ?`, [game_id]);
      }

    } else if (eventType === 'game-end') {
      if (game_id && duration) {
        // Update average duration
        await db.run(
          `INSERT INTO game_statistics (game_id, average_duration)
           VALUES (?, ?)
           ON CONFLICT(game_id) DO UPDATE SET
             average_duration = (average_duration + ?) / 2`,
          [game_id, duration, duration]
        );
      }

    } else if (eventType === 'banner-click') {
      if (banner_id) {
        await db.run(
          `INSERT INTO banner_statistics (banner_id, clicks, last_click)
           VALUES (?, 1, ?)
           ON CONFLICT(banner_id) DO UPDATE SET
             clicks     = clicks + 1,
             last_click = ?`,
          [banner_id, timestamp, timestamp]
        );
        // Also update banners.click_count
        await db.run(`UPDATE banners SET click_count = COALESCE(click_count, 0) + 1 WHERE id = ?`, [banner_id]);
      }

    } else if (eventType === 'favorite') {
      if (game_id) {
        await db.run(
          `INSERT INTO game_statistics (game_id, favorite_count)
           VALUES (?, 1)
           ON CONFLICT(game_id) DO UPDATE SET
             favorite_count = favorite_count + 1`,
          [game_id]
        );
      }
    }

    res.json({ success: true, message: 'Event recorded' });
  } catch (err) {
    console.error('recordEvent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const appOpen    = (req, res) => recordEvent(req, res, 'app-open');
const gameStart  = (req, res) => recordEvent(req, res, 'game-start');
const gameEnd    = (req, res) => recordEvent(req, res, 'game-end');
const bannerClick = (req, res) => recordEvent(req, res, 'banner-click');
const favorite   = (req, res) => recordEvent(req, res, 'favorite');

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
const getDashboardData = async (req, res) => {
  try {
    // ── Overview ──────────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];

    const [
      totalGamesRow,
      totalCatsRow,
      totalBannerClicksRow,
      totalGamePlaysRow,
      totalAppOpensRow,
      activeUsersTodayRow,
      totalUsersRow,
      avgSessionRow,
      favoritesRow
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as c FROM games WHERE status = ?', ['نشط']),
      db.get('SELECT COUNT(*) as c FROM categories WHERE status = ?', ['نشط']),
      db.get('SELECT COALESCE(SUM(clicks), 0) as c FROM banner_statistics'),
      db.get('SELECT COALESCE(SUM(game_plays), 0) as c FROM daily_statistics'),
      db.get('SELECT COALESCE(SUM(app_opens), 0) as c FROM daily_statistics'),
      db.get('SELECT COALESCE(active_users, 0) as c FROM daily_statistics WHERE date = ?', [today]),
      db.get('SELECT COUNT(DISTINCT user_id) as c FROM analytics_events WHERE user_id IS NOT NULL'),
      db.get('SELECT COALESCE(AVG(average_duration), 0) as c FROM game_statistics WHERE average_duration > 0'),
      db.get('SELECT COALESCE(SUM(favorite_count), 0) as c FROM game_statistics')
    ]);

    const todayRow = await db.get(
      'SELECT COALESCE(game_plays, 0) as c FROM daily_statistics WHERE date = ?',
      [today]
    );

    const overview = {
      totalUsers:       totalUsersRow?.c     || 0,
      activeUsersToday: activeUsersTodayRow?.c || 0,
      totalGames:       totalGamesRow?.c      || 0,
      totalCategories:  totalCatsRow?.c       || 0,
      totalBannerClicks: totalBannerClicksRow?.c || 0,
      appOpens:         totalAppOpensRow?.c   || 0,
      gamePlays:        totalGamePlaysRow?.c  || 0,
      gamesPlayedToday: todayRow?.c           || 0,
      favorites:        favoritesRow?.c       || 0,
      avgSessionTime:   Math.round(avgSessionRow?.c || 0)
    };

    // ── Top 10 Games ──────────────────────────────────────────────────────────
    const topGames = await db.all(`
      SELECT g.id, g.title as name, g.image, g.image_url,
             c.name as category,
             COALESCE(s.play_count, 0)       as plays,
             COALESCE(s.unique_players, 0)   as uniquePlayers,
             COALESCE(s.average_duration, 0) as avgTime,
             COALESCE(s.favorite_count, 0)   as favorites,
             s.last_played as lastPlayed
      FROM games g
      LEFT JOIN game_statistics s ON s.game_id = g.id
      LEFT JOIN categories c ON g.category_id = c.id
      ORDER BY COALESCE(s.play_count, 0) DESC
      LIMIT 10
    `);

    // ── Most Popular Category ─────────────────────────────────────────────────
    const topCategories = await db.all(`
      SELECT c.name, COUNT(g.id) as game_count,
             COALESCE(SUM(s.play_count), 0) as total_plays
      FROM categories c
      LEFT JOIN games g ON g.category_id = c.id
      LEFT JOIN game_statistics s ON s.game_id = g.id
      GROUP BY c.id
      ORDER BY total_plays DESC
      LIMIT 5
    `);

    // ── Recent Activity ────────────────────────────────────────────────────────
    const recentActivity = await db.all(`
      SELECT e.timestamp as time, g.title as game, e.event_type as action, e.user_id
      FROM analytics_events e
      LEFT JOIN games g ON e.game_id = g.id
      ORDER BY e.timestamp DESC
      LIMIT 20
    `);

    // ── Banner Stats ──────────────────────────────────────────────────────────
    const bannerStats = await db.all(`
      SELECT b.title, b.id,
             COALESCE(s.views, 0)  as views,
             COALESCE(s.clicks, 0) as clicks,
             s.last_click
      FROM banners b
      LEFT JOIN banner_statistics s ON s.banner_id = b.id
      ORDER BY COALESCE(s.clicks, 0) DESC
    `);

    const bannerStatsFormatted = bannerStats.map(r => ({
      id:        r.id,
      title:     r.title,
      views:     r.views,
      clicks:    r.clicks,
      ctr:       r.views > 0 ? ((r.clicks / r.views) * 100).toFixed(1) : '0.0',
      lastClick: r.last_click
    }));

    // ── Chart Data (30 days) ──────────────────────────────────────────────────
    const dailyRaw = await db.all(`
      SELECT date, COALESCE(active_users, 0) as active_users,
             COALESCE(game_plays, 0) as game_plays
      FROM daily_statistics
      ORDER BY date DESC LIMIT 30
    `);
    const dailySorted = dailyRaw.reverse();

    const charts = {
      dailyUsers:      dailySorted.map(r => ({ x: r.date, y: r.active_users })),
      dailyPlays:      dailySorted.map(r => ({ x: r.date, y: r.game_plays  })),
      topGamesLabels:  topGames.map(r => r.name),
      topGamesData:    topGames.map(r => r.plays),
      topCatsLabels:   topCategories.map(r => r.name),
      topCatsData:     topCategories.map(r => r.total_plays)
    };

    // ── Most Played Game ──────────────────────────────────────────────────────
    const mostPlayedGame = topGames[0] || null;

    // ── Most Popular Category ─────────────────────────────────────────────────
    const mostPopularCategory = topCategories[0] || null;

    res.json({
      success: true,
      data: {
        overview,
        topGames,
        topCategories,
        mostPlayedGame,
        mostPopularCategory,
        recentActivity,
        bannerStats: bannerStatsFormatted,
        charts
      }
    });
  } catch (err) {
    console.error('getDashboardData error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { appOpen, gameStart, gameEnd, bannerClick, favorite, getDashboardData };
