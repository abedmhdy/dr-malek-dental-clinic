const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const backupService = require('../services/backupService');
const { logAction } = require('../services/auditService');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  res.json(backupService.listBackups());
});

const status = asyncHandler(async (req, res) => {
  res.json(backupService.readStatus());
});

const create = asyncHandler(async (req, res) => {
  const destPath = await backupService.createBackup();
  await logAction({ userId: req.session.user.id, action: 'BACKUP_CREATED', ipAddress: req.ip });
  res.status(201).json({ file: path.basename(destPath) });
});

// Streams a previously created backup file straight to the browser's
// Downloads folder so the doctor can move it to a USB drive / external disk.
const download = asyncHandler(async (req, res, next) => {
  const { file } = req.params;
  if (!/^clinic-backup-[\w-]+\.sql$/.test(file)) {
    return next(new AppError(400, 'errors.invalidBackupFile'));
  }
  const fullPath = path.join(backupService.BACKUPS_DIR, file);
  res.download(fullPath, file, (err) => {
    if (err && !res.headersSent) next(new AppError(404, 'errors.backupNotFound'));
  });
});

module.exports = { list, create, download, status };
