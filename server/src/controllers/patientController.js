const asyncHandler = require('../utils/asyncHandler');
const patientService = require('../services/patientService');
const appointmentService = require('../services/appointmentService');
const visitService = require('../services/visitService');
const { logAction } = require('../services/auditService');

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const result = await patientService.listPatients({ page, pageSize });
  res.json(result);
});

const checkDuplicates = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.query;
  const candidates = await patientService.findPossibleDuplicates({ firstName, lastName, phone });
  res.json({ candidates });
});

const create = asyncHandler(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'PATIENT_CREATED',
    entityType: 'Patient',
    entityId: patient.id,
    ipAddress: req.ip,
  });
  res.status(201).json(patient);
});

const getOne = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.id);
  res.json(patient);
});

const update = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'PATIENT_UPDATED',
    entityType: 'Patient',
    entityId: patient.id,
    ipAddress: req.ip,
  });
  res.json(patient);
});

const archive = asyncHandler(async (req, res) => {
  const patient = await patientService.archivePatient(req.params.id);
  await logAction({
    userId: req.session.user.id,
    action: 'PATIENT_ARCHIVED',
    entityType: 'Patient',
    entityId: patient.id,
    ipAddress: req.ip,
  });
  res.json(patient);
});

const appointments = asyncHandler(async (req, res) => {
  const list_ = await appointmentService.listByPatient(req.params.id);
  res.json(list_);
});

const visits = asyncHandler(async (req, res) => {
  const list_ = await visitService.listByPatient(req.params.id);
  res.json(list_);
});

module.exports = { list, checkDuplicates, create, getOne, update, archive, appointments, visits };
