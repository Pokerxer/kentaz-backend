const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../utils/jwt');

exports.auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// staff or admin can access POS
exports.posAccess = async (req, res, next) => {
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'POS access required' });
  }
  next();
};

// Any authenticated staff or admin (for routes all staff can access regardless of permissions)
exports.staffOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'staff') return next();
  return res.status(403).json({ error: 'Access denied' });
};

// Admin OR staff who has the given permission path embedded in their JWT.
// Staff must re-login after admin updates their permissions.
exports.adminOrStaff = (permPath) => (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'staff' && (req.user.permissions || []).includes(permPath)) return next();
  return res.status(403).json({ error: 'Access denied' });
};
