const express = require('express');
const router  = express.Router();

const authRoutes       = require('./auth');
const gamesRoutes      = require('./games');
const categoriesRoutes = require('./categories');
const bannersRoutes    = require('./banners');
const settingsRoutes   = require('./settings');
const uploadRoutes     = require('./upload');
const analyticsRoutes  = require('./analytics');
const flutterRoutes    = require('./flutter');

// Auth routes at root (login, logout, profile, change-password)
router.use('/', authRoutes);

// CMS Management routes
router.use('/games',      gamesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/banners',    bannersRoutes);
router.use('/settings',   settingsRoutes);
router.use('/upload',     uploadRoutes);
router.use('/analytics',  analyticsRoutes);

// Flutter public API
router.use('/flutter', flutterRoutes);

module.exports = router;
