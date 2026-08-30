const app = require('./app');
const env = require('./config/env');
const backupScheduler = require('./services/backupScheduler');

const server = app.listen(env.port, () => {
  console.log(`Dental Clinic API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  backupScheduler.start();
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
