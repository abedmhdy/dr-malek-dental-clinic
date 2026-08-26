const AppError = require('../utils/AppError');

// Central error handler. Never leaks stack traces or raw DB/driver errors to
// the client — the frontend translates `messageKey` into the active language.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: true,
      messageKey: err.messageKey,
      details: err.details,
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: true,
    messageKey: 'errors.generic',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: true, messageKey: 'errors.notFound' });
}

module.exports = { errorHandler, notFoundHandler };
