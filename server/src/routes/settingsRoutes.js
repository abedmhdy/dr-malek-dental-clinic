const express = require('express');
const settingsController = require('../controllers/settingsController');
const backupController = require('../controllers/backupController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', settingsController.getSettings);
router.put('/', requireRole('DOCTOR'), settingsController.updateSettings);

router.get('/backups', requireRole('DOCTOR'), backupController.list);
router.post('/backups', requireRole('DOCTOR'), backupController.create);
router.get('/backups/:file/download', requireRole('DOCTOR'), backupController.download);

module.exports = router;
