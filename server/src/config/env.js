require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: required('SESSION_SECRET', process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionMaxAgeMinutes: parseInt(process.env.SESSION_MAX_AGE_MINUTES || '480', 10),
  // Cloud PostgreSQL connection strings. Never logged, never sent to the
  // frontend. See server/.env.example for how to obtain these from Neon.
  databaseUrl: required('DATABASE_URL', process.env.NODE_ENV === 'test' ? 'postgresql://test' : undefined),
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
};

module.exports = env;
