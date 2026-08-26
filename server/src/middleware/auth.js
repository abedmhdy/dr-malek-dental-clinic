const AppError = require('../utils/AppError');

// Blocks access to any route unless a valid session exists.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return next(new AppError(401, 'errors.unauthorized'));
  }
  return next();
}

// Restricts a route to specific roles (RBAC scaffold for future staff accounts).
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.session || !req.session.user) {
      return next(new AppError(401, 'errors.unauthorized'));
    }
    if (!roles.includes(req.session.user.role)) {
      return next(new AppError(403, 'errors.forbidden'));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
