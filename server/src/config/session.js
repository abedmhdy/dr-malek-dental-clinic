const session = require('express-session');
const env = require('./env');

// MemoryStore is intentional for the v1 local single-user deployment: the
// doctor simply logs in again after a server restart. When this app is
// later deployed to a shared server, swap this for a persistent store
// (e.g. connect-sqlite3 or connect-pg-simple) without touching any route.
const sessionMiddleware = session({
  name: 'clinic.sid',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // Real hosted deployments (NODE_ENV=production — see DEPLOYMENT.md) sit
    // behind HTTPS and need Secure cookies, whether or not they also serve
    // the built frontend themselves. The packaged desktop app is also
    // NODE_ENV=production for its other hardening, but talks to itself over
    // plain http://localhost, so it explicitly sets LOOPBACK_ONLY=1 to be
    // excluded here — see server/src/config/env.js.
    secure: env.isProduction && !env.isLoopbackOnly,
    maxAge: env.sessionMaxAgeMinutes * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
