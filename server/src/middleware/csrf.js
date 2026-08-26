const crypto = require('crypto');
const AppError = require('../utils/AppError');

// Double-submit-cookie style CSRF protection tailored to a session-cookie SPA:
// a token is generated per session and must be echoed back in a custom
// header on every state-changing request. A cross-site page cannot read the
// token (it's not in a cookie readable cross-site, and it can't set custom
// headers on a simple cross-site form submission), so this blocks classic CSRF.
function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req, res, next) {
  ensureCsrfToken(req);

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const headerToken = req.get('X-CSRF-Token');
  if (!headerToken || headerToken !== req.session.csrfToken) {
    return next(new AppError(403, 'errors.csrf'));
  }
  return next();
}

module.exports = { csrfProtection, ensureCsrfToken };
