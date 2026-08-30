import client from './client';

export const getFinancialSummary = (patientId) =>
  client.get(`/patients/${patientId}/financial-summary`).then((r) => r.data);

export const getPatientPayments = (patientId) =>
  client.get(`/patients/${patientId}/payments`).then((r) => r.data);

export const createTreatmentPlan = (payload) => client.post('/treatment-plans', payload).then((r) => r.data);
export const updateTreatmentPlan = (id, payload) => client.put(`/treatment-plans/${id}`, payload).then((r) => r.data);

export const createPayment = (payload) => client.post('/payments', payload).then((r) => r.data);
export const updatePayment = (id, payload) => client.put(`/payments/${id}`, payload).then((r) => r.data);
export const voidPayment = (id, reason) => client.post(`/payments/${id}/void`, { reason }).then((r) => r.data);
