const asyncHandler = require('../utils/asyncHandler');
const settingsService = require('../services/settingsService');
const { logAction } = require('../services/auditService');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  res.json(settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'SETTINGS_UPDATED',
    ipAddress: req.ip,
  });
  res.json(settings);
});

module.exports = { getSettings, updateSettings };
