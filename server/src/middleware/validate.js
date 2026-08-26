const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Runs after express-validator chains; converts failures into a single
// AppError with per-field messageKeys the frontend can localize.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fieldErrors = result.array().map((e) => ({
    field: e.path,
    messageKey: e.msg,
  }));

  return next(new AppError(422, 'errors.validation', fieldErrors));
}

module.exports = validate;
