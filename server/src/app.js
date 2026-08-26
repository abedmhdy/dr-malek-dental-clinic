const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const sessionMiddleware = require('./config/session');
const { csrfProtection } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
