const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'super_secret_jwt_key_cms';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid Token' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken, SECRET_KEY };
