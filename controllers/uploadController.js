const path = require('path');
const fs   = require('fs');

const VALID_TYPES = ['games', 'banners', 'categories', 'admin'];

// ── POST /api/upload ──────────────────────────────────────────────────────────
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const type      = (req.body.type || 'games').toLowerCase();
  const targetDir = VALID_TYPES.includes(type) ? type : 'games';
  const fileUrl   = `/uploads/${targetDir}/${req.file.filename}`;

  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url:      `${req.protocol}://${req.get('host')}${fileUrl}`,
      path:     fileUrl,
      filename: req.file.filename,
      size:     req.file.size,
      mimetype: req.file.mimetype
    }
  });
};

// ── DELETE /api/upload ────────────────────────────────────────────────────────
const deleteFile = (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ success: false, message: 'filePath is required' });
  }

  // Security: only allow deleting from /uploads/
  if (!filePath.startsWith('/uploads/')) {
    return res.status(403).json({ success: false, message: 'Cannot delete files outside uploads directory' });
  }

  const absolutePath = path.join(__dirname, '..', filePath);

  // Prevent path traversal
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!absolutePath.startsWith(uploadsDir)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.json({ success: true, message: 'File not found, already deleted' });
    }
  } catch (err) {
    console.error('deleteFile error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
};

module.exports = { uploadFile, deleteFile };
