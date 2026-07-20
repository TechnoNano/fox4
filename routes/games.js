const express  = require('express');
const router   = express.Router();
const { authenticateToken } = require('../middleware/auth');
const gamesController = require('../controllers/gamesController');
const validate = require('../middleware/validator');
const { body } = require('express-validator');

// Public (Flutter reads games)
router.get('/',    gamesController.getAll);
router.get('/:id', gamesController.getById);

// Protected (CMS admin only)
router.post('/', authenticateToken, validate([
  body('title').notEmpty().withMessage('Title is required')
]), gamesController.create);

router.put('/:id',    authenticateToken, gamesController.update);
router.patch('/:id',  authenticateToken, gamesController.update); // allow PATCH too
router.delete('/:id', authenticateToken, gamesController.remove);

module.exports = router;
