const { Prisma } = require('@prisma/client');
const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { todayStr } = require('../utils/dateUtils');

const { Decimal } = Prisma;

const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'];
const TREATMENT_PLAN_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

function toMoneyString(decimal) {
  return new Decimal(decimal).toFixed(2);
}

function sumDecimals(values) {
  return values.reduce((sum, v) => sum.plus(v), new Decimal(0));
}

// A payment "counts" toward a balance only while it hasn't been voided.
// Voided payments stay in the table (financial history is never erased)
// but are excluded from every total/remaining calculation.
function isLive(payment) {
  return payment.voidedAt === null;
}

// --- Treatment plans --------------------------------------------------

async function createTreatmentPlan(patientId, data) {
  const plan = await prisma.treatmentPlan.create({
    data: {
      patientId: Number(patientId),
      title: data.title,
      description: data.description || null,
      totalPrice: new Decimal(data.totalPrice),
      currency: data.currency || 'ILS',
      status: data.status || 'ACTIVE',
      startDate: data.startDate || null,
      completedDate: data.completedDate || null,
    },
  });
  return plan;
}

async function updateTreatmentPlan(id, data) {
  const existing = await prisma.treatmentPlan.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, 'errors.treatmentPlanNotFound');

  if (data.status && !TREATMENT_PLAN_STATUSES.includes(data.status)) {
    throw new AppError(422, 'errors.invalidTreatmentPlanStatus');
  }

  const updated = await prisma.treatmentPlan.update({
    where: { id: Number(id) },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      totalPrice: data.totalPrice !== undefined ? new Decimal(data.totalPrice) : existing.totalPrice,
      status: data.status ?? existing.status,
      startDate: data.startDate ?? existing.startDate,
      completedDate: data.completedDate ?? existing.completedDate,
    },
  });
  return updated;
}

// Per-plan and overall totals for a patient. Every number is computed here,
// from the payment ledger, and returned as a fixed 2-decimal string — the
// frontend only ever displays these, it never does its own money math.
async function getPatientFinancialSummary(patientId) {
  const plans = await prisma.treatmentPlan.findMany({
    where: { patientId: Number(patientId) },
    orderBy: { createdAt: 'asc' },
    include: { payments: true },
  });

  const planSummaries = plans.map((plan) => {
    const livePayments = plan.payments.filter(isLive);
    const totalPaid = sumDecimals(livePayments.map((p) => p.amount));
    const totalPrice = new Decimal(plan.totalPrice);
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      currency: plan.currency,
      startDate: plan.startDate,
      completedDate: plan.completedDate,
      totalPrice: toMoneyString(totalPrice),
      totalPaid: toMoneyString(totalPaid),
      remaining: toMoneyString(totalPrice.minus(totalPaid)),
    };
  });

  const overallTotalPrice = sumDecimals(plans.map((p) => new Decimal(p.totalPrice)));
  const overallTotalPaid = sumDecimals(planSummaries.map((p) => new Decimal(p.totalPaid)));

  return {
    plans: planSummaries,
    overall: {
      totalPrice: toMoneyString(overallTotalPrice),
      totalPaid: toMoneyString(overallTotalPaid),
      remaining: toMoneyString(overallTotalPrice.minus(overallTotalPaid)),
      currency: plans[0]?.currency || 'ILS',
    },
  };
}

// --- Payments -----------------------------------------------------------

async function assertPlanBelongsToPatient(treatmentPlanId, patientId) {
  const plan = await prisma.treatmentPlan.findUnique({ where: { id: Number(treatmentPlanId) } });
  if (!plan || plan.patientId !== Number(patientId)) {
    throw new AppError(404, 'errors.treatmentPlanNotFound');
  }
  return plan;
}

async function remainingForPlan(treatmentPlanId, excludePaymentId) {
  const plan = await prisma.treatmentPlan.findUnique({ where: { id: Number(treatmentPlanId) } });
  const payments = await prisma.payment.findMany({
    where: {
      treatmentPlanId: Number(treatmentPlanId),
      voidedAt: null,
      ...(excludePaymentId ? { id: { not: Number(excludePaymentId) } } : {}),
    },
  });
  const totalPaid = sumDecimals(payments.map((p) => p.amount));
  return new Decimal(plan.totalPrice).minus(totalPaid);
}

async function createPayment(data, actorUserId) {
  const amount = new Decimal(data.amount);
  if (amount.lte(0)) {
    throw new AppError(422, 'errors.paymentAmountMustBePositive');
  }

  const plan = await assertPlanBelongsToPatient(data.treatmentPlanId, data.patientId);

  if (data.visitId) {
    const visit = await prisma.visit.findUnique({ where: { id: Number(data.visitId) } });
    if (!visit || visit.patientId !== Number(data.patientId)) {
      throw new AppError(404, 'errors.visitNotFound');
    }
  }
  if (data.appointmentId) {
    const appt = await prisma.appointment.findUnique({ where: { id: Number(data.appointmentId) } });
    if (!appt || appt.patientId !== Number(data.patientId)) {
      throw new AppError(404, 'errors.appointmentNotFound');
    }
  }
  if (data.paymentMethod && !PAYMENT_METHODS.includes(data.paymentMethod)) {
    throw new AppError(422, 'errors.invalidPaymentMethod');
  }

  const remainingBefore = await remainingForPlan(data.treatmentPlanId);
  if (amount.gt(remainingBefore) && !data.override) {
    throw new AppError(409, 'errors.paymentExceedsBalance', {
      remaining: toMoneyString(remainingBefore),
      currency: plan.currency,
    });
  }

  const payment = await prisma.payment.create({
    data: {
      patientId: Number(data.patientId),
      treatmentPlanId: Number(data.treatmentPlanId),
      visitId: data.visitId ? Number(data.visitId) : null,
      appointmentId: data.appointmentId ? Number(data.appointmentId) : null,
      amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
      createdByUserId: actorUserId,
    },
  });

  return payment;
}

async function updatePayment(id, data, actorUserId) {
  const existing = await prisma.payment.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, 'errors.paymentNotFound');
  if (existing.voidedAt) throw new AppError(409, 'errors.paymentAlreadyVoided');

  let amount = existing.amount;
  if (data.amount !== undefined) {
    amount = new Decimal(data.amount);
    if (amount.lte(0)) throw new AppError(422, 'errors.paymentAmountMustBePositive');
  }
  if (data.paymentMethod && !PAYMENT_METHODS.includes(data.paymentMethod)) {
    throw new AppError(422, 'errors.invalidPaymentMethod');
  }

  if (!amount.eq(existing.amount)) {
    const remainingExcludingThis = await remainingForPlan(existing.treatmentPlanId, existing.id);
    if (amount.gt(remainingExcludingThis) && !data.override) {
      throw new AppError(409, 'errors.paymentExceedsBalance', {
        remaining: toMoneyString(remainingExcludingThis),
      });
    }
  }

  const updated = await prisma.payment.update({
    where: { id: Number(id) },
    data: {
      amount,
      paymentDate: data.paymentDate ?? existing.paymentDate,
      paymentMethod: data.paymentMethod ?? existing.paymentMethod,
      notes: data.notes ?? existing.notes,
    },
  });

  return updated;
}

async function voidPayment(id, reason, actorUserId) {
  const existing = await prisma.payment.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new AppError(404, 'errors.paymentNotFound');
  if (existing.voidedAt) throw new AppError(409, 'errors.paymentAlreadyVoided');
  if (!reason || !reason.trim()) throw new AppError(422, 'errors.voidReasonRequired');

  const voided = await prisma.payment.update({
    where: { id: Number(id) },
    data: { voidedAt: new Date(), voidedReason: reason.trim(), voidedByUserId: actorUserId },
  });

  return voided;
}

// Full payment history for a patient, each entry annotated with the plan's
// running balance immediately after that payment — computed by ordering
// live payments per plan by (paymentDate, id) and taking a cumulative sum,
// so a payment added out of order later never rewrites earlier entries'
// displayed balance (each one reflects only payments up to its own point
// in that ordering, exactly as recorded at the time).
async function listPaymentsForPatient(patientId) {
  const [payments, plans] = await Promise.all([
    prisma.payment.findMany({
      where: { patientId: Number(patientId) },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
      include: {
        treatmentPlan: { select: { id: true, title: true, totalPrice: true, currency: true } },
        visit: { select: { id: true, visitDate: true, treatmentType: true } },
        createdBy: { select: { fullNameEn: true, fullNameAr: true, fullNameHe: true } },
        voidedBy: { select: { fullNameEn: true, fullNameAr: true, fullNameHe: true } },
      },
    }),
    prisma.treatmentPlan.findMany({ where: { patientId: Number(patientId) } }),
  ]);

  const runningTotals = new Map(); // treatmentPlanId -> Decimal
  const withBalance = payments.map((payment) => {
    const planTotal = new Decimal(plans.find((pl) => pl.id === payment.treatmentPlanId)?.totalPrice || 0);
    if (isLive(payment)) {
      const runningPaid = (runningTotals.get(payment.treatmentPlanId) || new Decimal(0)).plus(payment.amount);
      runningTotals.set(payment.treatmentPlanId, runningPaid);
      return {
        ...payment,
        amount: toMoneyString(payment.amount),
        balanceAfterPayment: toMoneyString(planTotal.minus(runningPaid)),
      };
    }
    return { ...payment, amount: toMoneyString(payment.amount), balanceAfterPayment: null };
  });

  return withBalance.sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : a.paymentDate > b.paymentDate ? -1 : b.id - a.id));
}

// Used by the visit timeline: live (non-voided) payments recorded during a
// specific visit, with the plan's balance immediately after each.
async function getPaymentsForVisit(visitId, patientId) {
  const all = await listPaymentsForPatient(patientId);
  return all.filter((p) => p.visitId === Number(visitId) && p.voidedAt === null);
}

// Clinic-wide totals for the dashboard (kept intentionally small — just two
// numbers — per the "don't clutter the dashboard" requirement).
async function getClinicFinancialOverview() {
  const today = todayStr();
  const [planTotalAgg, paidAgg, paidTodayAgg] = await Promise.all([
    prisma.treatmentPlan.aggregate({ _sum: { totalPrice: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { voidedAt: null } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { voidedAt: null, paymentDate: today } }),
  ]);
  const totalPlanned = new Decimal(planTotalAgg._sum.totalPrice || 0);
  const totalPaid = new Decimal(paidAgg._sum.amount || 0);
  return {
    totalOutstandingBalance: toMoneyString(totalPlanned.minus(totalPaid)),
    paymentsReceivedToday: toMoneyString(paidTodayAgg._sum.amount || 0),
  };
}

module.exports = {
  PAYMENT_METHODS,
  TREATMENT_PLAN_STATUSES,
  toMoneyString,
  createTreatmentPlan,
  updateTreatmentPlan,
  getPatientFinancialSummary,
  createPayment,
  updatePayment,
  voidPayment,
  listPaymentsForPatient,
  getPaymentsForVisit,
  getClinicFinancialOverview,
};
