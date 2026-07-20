const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/app-open', analyticsController.appOpen);
router.post('/game-start', analyticsController.gameStart);
router.post('/game-end', analyticsController.gameEnd);
router.post('/banner-click', analyticsController.bannerClick);
router.post('/favorite', analyticsController.favorite);

// Dashboard data requires authentication since it's for the CMS admin
router.get('/dashboard', authenticateToken, analyticsController.getDashboardData);

module.exports = router;
