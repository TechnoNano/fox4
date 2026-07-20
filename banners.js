const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const bannersController = require('../controllers/bannersController');

router.get('/', bannersController.getAll);
router.get('/:id', bannersController.getById);
router.post('/', authenticateToken, bannersController.create);
router.put('/:id', authenticateToken, bannersController.update);
router.delete('/:id', authenticateToken, bannersController.remove);

module.exports = router;
