const backupService = require('./backupService');
const { logAction } = require('./auditService');

// If the last successful backup is older than this (or none exists), an
// automatic backup is due. Checked periodically rather than at a fixed
// clock time because this app doesn't run 24/7 — a clinic desktop app is
// only "on" while the doctor has it open, so "run one shortly after
// startup if the last one is stale" is more reliable than "run at 2am."
const MAX_BACKUP_AGE_HOURS = parseInt(process.env.AUTO_BACKUP_MAX_AGE_HOURS || '24', 10);
// How often to re-check while the process stays running (e.g. a long open
// clinic day, or a hosted backend that never restarts).
const CHECK_INTERVAL_HOURS = parseInt(process.env.AUTO_BACKUP_CHECK_INTERVAL_HOURS || '6', 10);

let timer = null;

function hoursSince(isoString) {
  return (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
}

function isBackupDue() {
  const status = backupService.readStatus();
  if (!status.lastSuccess) return true;
  return hoursSince(status.lastSuccess.at) >= MAX_BACKUP_AGE_HOURS;
}

async function runIfDue() {
  if (!isBackupDue()) return;
  try {
    const destPath = await backupService.createBackup();
    console.log('[backup] automatic backup created:', destPath);
    await logAction({ action: 'BACKUP_AUTO_CREATED' });
  } catch (err) {
    // backupService.createBackup() already redacts and records the failure
    // to backup-status.json — this is just the process-log side of it.
    console.error('[backup] automatic backup failed:', err.message);
    await logAction({ action: 'BACKUP_AUTO_FAILED' });
  }
  scheduleNextCheck();
}

function scheduleNextCheck() {
  const nextAt = new Date(Date.now() + CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
  backupService.setNextScheduledAt(nextAt.toISOString());
}

// Starts the in-process scheduler. Safe to call once at server boot. Not
// started under NODE_ENV=test so test runs never shell out to pg_dump.
function start() {
  if (process.env.NODE_ENV === 'test' || timer) return;

  // Give the backend (and, for the desktop app, the Neon connection it
  // depends on) a little time to settle after boot before the first check.
  setTimeout(runIfDue, 10 * 1000);
  timer = setInterval(runIfDue, CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
  scheduleNextCheck();
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop, isBackupDue, MAX_BACKUP_AGE_HOURS, CHECK_INTERVAL_HOURS };
