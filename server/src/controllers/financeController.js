const asyncHandler = require('../utils/asyncHandler');
const financeService = require('../services/financeService');
const { logAction } = require('../services/auditService');

const createTreatmentPlan = asyncHandler(async (req, res) => {
  const plan = await financeService.createTreatmentPlan(req.body.patientId, req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'TREATMENT_PLAN_CREATED',
    entityType: 'TreatmentPlan',
    entityId: plan.id,
    details: { patientId: plan.patientId, title: plan.title, totalPrice: financeService.toMoneyString(plan.totalPrice) },
    ipAddress: req.ip,
  });
  res.status(201).json(plan);
});

const updateTreatmentPlan = asyncHandler(async (req, res) => {
  const plan = await financeService.updateTreatmentPlan(req.params.id, req.body);
  await logAction({
    userId: req.session.user.id,
    action: 'TREATMENT_PLAN_UPDATED',
    entityType: 'TreatmentPlan',
    entityId: plan.id,
    details: { title: plan.title, status: plan.status, totalPrice: financeService.toMoneyString(plan.totalPrice) },
    ipAddress: req.ip,
  });
  res.json(plan);
});

const createPayment = asyncHandler(async (req, res) => {
  const payment = await financeService.createPayment(req.body, req.session.user.id);
  await logAction({
    userId: req.session.user.id,
    action: 'PAYMENT_CREATED',
    entityType: 'Payment',
    entityId: payment.id,
    details: {
      patientId: payment.patientId,
      treatmentPlanId: payment.treatmentPlanId,
      amount: financeService.toMoneyString(payment.amount),
      override: Boolean(req.body.override),
    },
    ipAddress: req.ip,
  });
  res.status(201).json(payment);
});

const updatePayment = asyncHandler(async (req, res) => {
  const payment = await financeService.updatePayment(req.params.id, req.body, req.session.user.id);
  await logAction({
    userId: req.session.user.id,
    action: 'PAYMENT_UPDATED',
    entityType: 'Payment',
    entityId: payment.id,
    details: { amount: financeService.toMoneyString(payment.amount), paymentDate: payment.paymentDate },
    ipAddress: req.ip,
  });
  res.json(payment);
});

const voidPayment = asyncHandler(async (req, res) => {
  const payment = await financeService.voidPayment(req.params.id, req.body.reason, req.session.user.id);
  await logAction({
    userId: req.session.user.id,
    action: 'PAYMENT_VOIDED',
    entityType: 'Payment',
    entityId: payment.id,
    details: { amount: financeService.toMoneyString(payment.amount), reason: payment.voidedReason },
    ipAddress: req.ip,
  });
  res.json(payment);
});

module.exports = { createTreatmentPlan, updateTreatmentPlan, createPayment, updatePayment, voidPayment };
