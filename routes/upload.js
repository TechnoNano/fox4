const express  = require('express');
const router   = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const { uploadFile, deleteFile } = require('../controllers/uploadController');

// POST /api/upload?type=games|banners|categories|admin
router.post('/', authenticateToken, upload.single('image'), uploadFile);

// DELETE /api/upload
router.delete('/', authenticateToken, deleteFile);

module.exports = router;
