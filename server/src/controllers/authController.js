const bcrypt = require('bcryptjs');
const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { logAction } = require('../services/auditService');
const { ensureCsrfToken } = require('../middleware/csrf');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function toSafeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullNameEn: user.fullNameEn,
    fullNameAr: user.fullNameAr,
    fullNameHe: user.fullNameHe,
    role: user.role,
  };
}

const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return next(new AppError(400, 'errors.usernamePasswordRequired'));
  }

  const user = await prisma.user.findUnique({ where: { username } });

  // Constant-shape response whether the user exists or not, to avoid
  // leaking which usernames are valid.
  if (!user || !user.isActive) {
    await logAction({ action: 'LOGIN_FAILED', details: { username }, ipAddress: req.ip });
    return next(new AppError(401, 'errors.invalidCredentials'));
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return next(new AppError(423, 'errors.accountLocked'));
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount, lockedUntil },
    });
    await logAction({ userId: user.id, action: 'LOGIN_FAILED', ipAddress: req.ip });
    return next(new AppError(401, 'errors.invalidCredentials'));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = toSafeUser(user);
    ensureCsrfToken(req);
    logAction({ userId: user.id, action: 'LOGIN', ipAddress: req.ip });
    return res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
  });
});

const logout = asyncHandler(async (req, res) => {
  const userId = req.session.user?.id;
  req.session.destroy(() => {
    res.clearCookie('clinic.sid');
    if (userId) logAction({ userId, action: 'LOGOUT', ipAddress: req.ip });
    res.json({ success: true });
  });
});

const me = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    const csrfToken = ensureCsrfToken(req);
    return res.json({ user: null, csrfToken });
  }
  res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
});

// Re-authentication for the manual "Lock" feature — verifies the password
// again without destroying the underlying session data (appointments in
// progress on screen are preserved), just re-confirms identity.
const unlock = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  if (!req.session.user) return next(new AppError(401, 'errors.unauthorized'));

  const user = await prisma.user.findUnique({ where: { id: req.session.user.id } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) return next(new AppError(401, 'errors.invalidCredentials'));

  res.json({ success: true });
});

module.exports = { login, logout, me, unlock };
