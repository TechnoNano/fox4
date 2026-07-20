const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const VALID_DIRS   = ['games', 'banners', 'categories', 'admin'];
const baseUploadDir = path.join(__dirname, '../uploads');

// Ensure all directories exist
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });
VALID_DIRS.forEach(dir => {
  const dirPath = path.join(baseUploadDir, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // multer processes multipart fields before body parser, so check query too
    const type      = (req.body.type || req.query.type || 'games').toLowerCase();
    const targetDir = VALID_DIRS.includes(type) ? type : 'games';
    cb(null, path.join(baseUploadDir, targetDir));
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  const ext     = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = upload;
