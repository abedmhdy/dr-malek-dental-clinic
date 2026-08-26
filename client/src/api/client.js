import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Holds the current CSRF token in memory (never in localStorage — it is
// session-scoped and re-issued by the server on every /auth/me or /login).
let csrfToken = null;
export function setCsrfToken(token) {
  csrfToken = token;
}

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  if (csrfToken && !['get', 'head', 'options'].includes((config.method || '').toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Normalizes server errors into { messageKey, details, status } so UI code
// never has to branch on axios internals or leak raw error text.
export function unwrapError(err) {
  if (err.response) {
    const data = err.response.data || {};
    return {
      status: err.response.status,
      messageKey: data.messageKey || 'errors.generic',
      details: data.details || null,
    };
  }
  return { status: 0, messageKey: 'errors.networkError', details: null };
}

export default client;
