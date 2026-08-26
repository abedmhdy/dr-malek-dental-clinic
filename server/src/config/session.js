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
    secure: env.isProduction,
    maxAge: env.sessionMaxAgeMinutes * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
