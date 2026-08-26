import client from './client';

export const listPatients = (page = 1, pageSize = 20) =>
  client.get('/patients', { params: { page, pageSize } }).then((r) => r.data);

export const getPatient = (id) => client.get(`/patients/${id}`).then((r) => r.data);

export const createPatient = (payload) => client.post('/patients', payload).then((r) => r.data);

export const updatePatient = (id, payload) => client.put(`/patients/${id}`, payload).then((r) => r.data);

export const archivePatient = (id) => client.delete(`/patients/${id}`).then((r) => r.data);

export const checkDuplicates = (params) =>
  client.get('/patients/check-duplicates', { params }).then((r) => r.data.candidates);

export const getPatientAppointments = (id) => client.get(`/patients/${id}/appointments`).then((r) => r.data);

export const getPatientVisits = (id) => client.get(`/patients/${id}/visits`).then((r) => r.data);
