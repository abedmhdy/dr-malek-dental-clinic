import client, { setCsrfToken } from './client';

export async function fetchMe() {
  const { data } = await client.get('/auth/me');
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function login(username, password) {
  const { data } = await client.post('/auth/login', { username, password });
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function logout() {
  await client.post('/auth/logout');
  setCsrfToken(null);
}

export async function unlock(password) {
  await client.post('/auth/unlock', { password });
}
