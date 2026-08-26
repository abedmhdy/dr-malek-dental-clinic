const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/me', authController.me);

router.post(
  '/login',
  loginLimiter,
  [
    body('username').trim().notEmpty().withMessage('errors.usernameRequired'),
    body('password').notEmpty().withMessage('errors.passwordRequired'),
  ],
  validate,
  authController.login
);

router.post('/logout', authController.logout);

router.post(
  '/unlock',
  loginLimiter,
  [body('password').notEmpty().withMessage('errors.passwordRequired')],
  validate,
  authController.unlock
);

module.exports = router;
