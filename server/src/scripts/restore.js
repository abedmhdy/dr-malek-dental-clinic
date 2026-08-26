// CLI restore helper: `npm run restore -- clinic-backup-2026-01-01T00-00-00-000Z.sql`
// Restores a backup file (created by `npm run backup`) into the database
// currently configured in DATABASE_URL/DIRECT_URL.
const backupService = require('../services/backupService');

const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: npm run restore -- <backup-file-name>.sql');
  console.error('Available backups are listed in server/backups/, or via Settings -> Backup in the app.');
  process.exit(1);
}

console.log(`Restoring ${fileName} into the database configured in .env ...`);
backupService
  .restoreBackup(fileName)
  .then(() => console.log('Restore complete.'))
  .catch((err) => {
    console.error('Restore failed:', err.message);
    process.exit(1);
  });
