// ── Global Error Handler ──────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // Log full error for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack || err);

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.'
    });
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body.'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
  }

  // Default internal server error
  const status  = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ success: false, message });
};

// ── 404 Handler ───────────────────────────────────────────────────────────────
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.path}`
  });
};

module.exports = { errorHandler, notFoundHandler };
