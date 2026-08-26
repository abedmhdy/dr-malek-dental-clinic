// CLI backup helper: `npm run backup`
// Dumps the live cloud database into server/backups/clinic-backup-<timestamp>.sql
const backupService = require('../services/backupService');

backupService
  .createBackup()
  .then((dest) => console.log(`Backup created: ${dest}`))
  .catch((err) => {
    console.error('Backup failed:', err.message);
    process.exit(1);
  });
