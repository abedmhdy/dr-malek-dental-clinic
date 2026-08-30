const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const sessionMiddleware = require('./config/session');
const { csrfProtection } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { isDatabaseReachable } = require('./services/healthService');
const routes = require('./routes');

const app = express();

// This app is served to the browser only, never renders templates itself,
// so a strict default-src of 'self' is safe and disables inline script risk.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1);
app.use(sessionMiddleware);
app.use(csrfProtection);
app.use('/api', apiLimiter, routes);

// Proves both that Express is running AND that the database is actually
// reachable (a plain "server is up" check is not enough — Electron's
// startup sequence and any future monitoring need to tell "backend fine,
// database unreachable" apart from "everything fine"). Never includes the
// underlying error, hostname, or connection string — only a boolean-derived
// status — so nothing about the database configuration leaks to a caller.
app.get('/api/health', async (req, res) => {
  const databaseOk = await isDatabaseReachable();
  res.status(databaseOk ? 200 : 503).json({
    status: 'ok',
    database: databaseOk ? 'ok' : 'unavailable',
  });
});

// Set only by the packaged desktop app: serves the pre-built React app from
// the same origin as the API, so the browser view inside Electron never
// needs a separate frontend dev server, and cookies/CSRF work as plain
// same-origin requests (no cross-origin cookie edge cases to worry about).
if (env.staticDir) {
  app.use(express.static(env.staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(env.staticDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
