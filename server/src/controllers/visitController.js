const asyncHandler = require('../utils/asyncHandler');
const visitService = require('../services/visitService');
const { logAction } = require('../services/auditService');

const create = asyncHandler(async (req, res) => {
  const visit = await visitService.createVisit(req.body, req.session.user.id);
  await logAction({
    userId: req.session.user.id,
    action: 'VISIT_CREATED',
    entityType: 'Visit',
    entityId: visit.id,
    ipAddress: req.ip,
  });
  res.status(201).json(visit);
});

const update = asyncHandler(async (req, res) => {
  const visit = await visitService.updateVisit(req.params.id, req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'VISIT_UPDATED',
    entityType: 'Visit',
    entityId: visit.id,
    ipAddress: req.ip,
  });
  res.json(visit);
});

const getOne = asyncHandler(async (req, res) => {
  const visit = await visitService.getVisitById(req.params.id);
  res.json(visit);
});

module.exports = { create, update, getOne };
