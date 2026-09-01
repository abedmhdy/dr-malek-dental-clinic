import axios from 'axios';

// The frontend is always served from the same origin as its own API — the
// desktop app's local backend serves it over loopback, and the hosted
// backend serves it over its own real domain — so a relative "/api" base
// resolves correctly in both cases automatically, with no build-time
// knowledge of which origin it'll actually run on. VITE_API_URL stays as
// an explicit override only for local `vite dev` (client and server run on
// different ports there, so a relative path wouldn't reach the backend).
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
