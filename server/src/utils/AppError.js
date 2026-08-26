// Application error carrying an HTTP status and a translation key instead of
// a hard-coded English message, so the frontend can localize it.
class AppError extends Error {
  constructor(statusCode, messageKey, details) {
    super(messageKey);
    this.statusCode = statusCode;
    this.messageKey = messageKey;
    this.details = details;
  }
}

module.exports = AppError;
