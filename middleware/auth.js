const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
req.user = user; // { id, is_admin }
    next();
  });
};

const isAdmin = (req, res, next) => {
  // This middleware assumes `authenticateToken` has already run and set `req.user`.
  // It should be chained in routes like: router.get('/admin-stuff', authenticateToken, isAdmin, ...);
if (req.user && req.user.is_admin) {
    next(); // User is an admin, proceed to the route handler.
  } else {
    // If req.user is not present or the user is not an admin, send a Forbidden status.
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
};

module.exports = { authenticateToken, isAdmin };