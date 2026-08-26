const rateLimit = require('express-rate-limit');

// Basic brute-force protection on the login endpoint.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, messageKey: 'errors.tooManyAttempts' },
});

// Looser limit applied to the whole API to guard against abuse/loops.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, messageKey: 'errors.tooManyRequests' },
});

module.exports = { loginLimiter, apiLimiter };
