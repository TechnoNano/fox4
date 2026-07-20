const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const categoriesController = require('../controllers/categoriesController');
const validate = require('../middleware/validator');
const { body } = require('express-validator');

router.get('/', categoriesController.getAll);
router.get('/:id', categoriesController.getById);

router.post('/', authenticateToken, validate([
  body('name').notEmpty().withMessage('Name is required')
]), categoriesController.create);

router.put('/:id', authenticateToken, categoriesController.update);
router.delete('/:id', authenticateToken, categoriesController.remove);

module.exports = router;
