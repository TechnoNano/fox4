const express    = require('express');
const router     = express.Router();
const flutter    = require('../controllers/flutterController');

// All Flutter routes are public (no auth needed for the mobile app)
// Rate limiting is applied at the server level

router.get('/home',        flutter.getHome);
router.get('/games',       flutter.getGames);
router.get('/games/:id',   flutter.getGame);
router.get('/categories',  flutter.getCategories);
router.get('/banners',     flutter.getBanners);
router.get('/settings',    flutter.getSettings);
router.get('/stats',       flutter.getStats);

module.exports = router;
