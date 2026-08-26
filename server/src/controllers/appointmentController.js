const asyncHandler = require('../utils/asyncHandler');
const appointmentService = require('../services/appointmentService');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const { from, to, doctorId } = req.query;
  const items = await appointmentService.listByDateRange({ from, to, doctorId });
  res.json(items);
});

const getOne = asyncHandler(async (req, res) => {
  const appt = await appointmentService.getAppointmentById(req.params.id);
  res.json(appt);
});

const create = asyncHandler(async (req, res) => {
  const doctorId = req.body.doctorId || req.session.user.id;
  const appt = await appointmentService.createAppointment(req.body, doctorId);
  await logAction({
    userId: req.session.user.id,
    action: 'APPOINTMENT_CREATED',
    entityType: 'Appointment',
    entityId: appt.id,
    ipAddress: req.ip,
  });
  res.status(201).json(appt);
});

const update = asyncHandler(async (req, res) => {
  const appt = await appointmentService.updateAppointment(req.params.id, req.body, req.body.doctorId);
  await logAction({
    userId: req.session.user.id,
    action: 'APPOINTMENT_UPDATED',
    entityType: 'Appointment',
    entityId: appt.id,
    ipAddress: req.ip,
  });
  res.json(appt);
});

const setStatus = asyncHandler(async (req, res) => {
  const appt = await appointmentService.setStatus(req.params.id, req.body.status);
  await logAction({
    userId: req.session.user.id,
    action: 'APPOINTMENT_STATUS_CHANGED',
    entityType: 'Appointment',
    entityId: appt.id,
    details: { status: req.body.status },
    ipAddress: req.ip,
  });
  res.json(appt);
});

const cancel = asyncHandler(async (req, res) => {
  const appt = await appointmentService.cancelAppointment(req.params.id);
  await logAction({
    userId: req.session.user.id,
    action: 'APPOINTMENT_CANCELLED',
    entityType: 'Appointment',
    entityId: appt.id,
    ipAddress: req.ip,
  });
  res.json(appt);
});

module.exports = { list, getOne, create, update, setStatus, cancel };
