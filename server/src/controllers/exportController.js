const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../db/prismaClient');
const { todayStr } = require('../utils/dateUtils');

function toCsv(rows, columns) {
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM so Excel opens Arabic/Hebrew UTF-8 text correctly.
  res.send('﻿' + csv);
}

const todaysAppointments = asyncHandler(async (req, res) => {
  const appts = await prisma.appointment.findMany({
    where: { date: todayStr() },
    include: { patient: true },
    orderBy: { startTime: 'asc' },
  });
  const rows = appts.map((a) => ({
    time: `${a.startTime}-${a.endTime}`,
    patientNumber: a.patient.patientNumber,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    phone: a.patient.phone,
    treatment: a.treatmentType,
    status: a.status,
  }));
  const csv = toCsv(rows, [
    { key: 'time', label: 'Time' },
    { key: 'patientNumber', label: 'Patient ID' },
    { key: 'patientName', label: 'Patient Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'status', label: 'Status' },
  ]);
  sendCsv(res, `today-appointments-${todayStr()}.csv`, csv);
});

// Only ever exports the single patient identified by :id — never leaks
// other patients' data in the same file.
const patientHistory = asyncHandler(async (req, res) => {
  const patientId = Number(req.params.id);
  const [patient, visits] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.visit.findMany({ where: { patientId }, orderBy: { visitDate: 'desc' } }),
  ]);
  const rows = visits.map((v) => ({
    date: v.visitDate,
    time: v.visitTime,
    treatment: v.treatmentType,
    description: v.treatmentDescription,
    notes: v.notes,
    nextVisit: v.nextVisitRecommendedDate,
  }));
  const csv = toCsv(rows, [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'description', label: 'Description' },
    { key: 'notes', label: 'Notes' },
    { key: 'nextVisit', label: 'Next Visit' },
  ]);
  sendCsv(res, `patient-${patient?.patientNumber || patientId}-history.csv`, csv);
});

module.exports = { todaysAppointments, patientHistory };
