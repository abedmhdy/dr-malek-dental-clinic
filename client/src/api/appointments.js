import client from './client';

export const listAppointments = (from, to) =>
  client.get('/appointments', { params: { from, to } }).then((r) => r.data);

export const getAppointment = (id) => client.get(`/appointments/${id}`).then((r) => r.data);

export const createAppointment = (payload) => client.post('/appointments', payload).then((r) => r.data);

export const updateAppointment = (id, payload) => client.put(`/appointments/${id}`, payload).then((r) => r.data);

export const setAppointmentStatus = (id, status) =>
  client.patch(`/appointments/${id}/status`, { status }).then((r) => r.data);

export const cancelAppointment = (id) => client.post(`/appointments/${id}/cancel`).then((r) => r.data);
