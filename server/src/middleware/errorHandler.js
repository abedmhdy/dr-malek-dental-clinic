const AppError = require('../utils/AppError');

// Prisma error codes/names that mean "could not reach or was disconnected
// from the database server" as opposed to a real application-level error
// (bad query, constraint violation, etc.). Used only to pick a friendlier
// messageKey — the underlying error (which may include the connection
// string) is still never sent to the client, only logged server-side.
const DB_UNREACHABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
function isDatabaseUnreachableError(err) {
  if (err && err.name === 'PrismaClientInitializationError') return true;
  if (err && typeof err.code === 'string' && DB_UNREACHABLE_CODES.has(err.code)) return true;
  return false;
}

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

  if (isDatabaseUnreachableError(err)) {
    return res.status(503).json({
      error: true,
      messageKey: 'errors.databaseUnavailable',
    });
  }

  return res.status(500).json({
    error: true,
    messageKey: 'errors.generic',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: true, messageKey: 'errors.notFound' });
}

module.exports = { errorHandler, notFoundHandler };
