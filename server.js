const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const routes     = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize DB (creates tables, indexes, default data)
require('./database/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global Error Handlers ─────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  process.exit(1);
});

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy:  { policy: 'cross-origin' }, // Allow CDN / Flutter image loads
  contentSecurityPolicy:      false                        // CMS uses inline scripts
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max:      20,                 // 20 login attempts per window
  message:  { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false
});

// Flutter API gets a more generous limit
const flutterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      2000,
  message:  { success: false, message: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders:   false
});

app.use('/api/login',   authLimiter);
app.use('/api/flutter', flutterLimiter);
app.use('/api',         apiLimiter);

// ── Static Files ──────────────────────────────────────────────────────────────
// Serve uploaded files with caching headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag:   true
}));

// Serve frontend (parent directory of backend)
const publicPath = path.join(__dirname, '../');
app.use(express.static(publicPath, {
  index: false // We handle the index manually
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── API 404 Handler ───────────────────────────────────────────────────────────
app.use('/api', notFoundHandler);

// ── SPA Fallback ──────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});


// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n✅  CMS Backend running on http://localhost:${PORT}`);
  console.log(`📱  Flutter API:   http://localhost:${PORT}/api/flutter/home`);
  console.log(`🔐  Admin Login:   http://localhost:${PORT}/api/login`);
  console.log(`📊  Dashboard:     http://localhost:${PORT}/api/analytics/dashboard\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  ERROR: Port ${PORT} is already in use.`);
    console.error(`   Please close the program using port ${PORT} and try again.\n`);
  } else {
    console.error('[SERVER ERROR]', err);
  }
  process.exit(1);
});

module.exports = app;
