const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Public routes
router.post('/login', validate([
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required')
]), authController.login);

router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

router.put('/profile', authenticateToken, validate([
  body('email').optional().isEmail().withMessage('Invalid email format')
]), authController.updateProfile);

router.post('/change-password', authenticateToken, validate([
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').notEmpty().isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
]), authController.changePassword);

module.exports = router;
