import client from './client';

export const getDashboardSummary = () => client.get('/dashboard/summary').then((r) => r.data);

export const searchPatients = (q) => client.get('/search', { params: { q } }).then((r) => r.data);

export const getSettings = () => client.get('/settings').then((r) => r.data);
export const updateSettings = (payload) => client.put('/settings', payload).then((r) => r.data);

export const listBackups = () => client.get('/settings/backups').then((r) => r.data);
export const createBackup = () => client.post('/settings/backups').then((r) => r.data);
export const backupDownloadUrl = (file) =>
  `${client.defaults.baseURL}/settings/backups/${encodeURIComponent(file)}/download`;

export const todaysAppointmentsExportUrl = () => `${client.defaults.baseURL}/export/today-appointments`;
export const patientHistoryExportUrl = (id) => `${client.defaults.baseURL}/export/patients/${id}/history`;
