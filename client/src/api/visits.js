import client from './client';

export const createVisit = (payload) => client.post('/visits', payload).then((r) => r.data);
export const updateVisit = (id, payload) => client.put(`/visits/${id}`, payload).then((r) => r.data);
export const getVisit = (id) => client.get(`/visits/${id}`).then((r) => r.data);
