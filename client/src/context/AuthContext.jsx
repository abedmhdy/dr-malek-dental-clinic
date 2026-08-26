import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as authApi from '../api/auth';
import { getSettings } from '../api/misc';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  const inactivityTimer = useRef(null);

  useEffect(() => {
    authApi
      .fetchMe()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getSettings()
      .then((s) => setAutoLockMinutes(s.autoLockMinutes))
      .catch(() => {});
  }, [user]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!user || !autoLockMinutes || locked) return;
    inactivityTimer.current = setTimeout(() => setLocked(true), autoLockMinutes * 60 * 1000);
  }, [user, autoLockMinutes, locked]);

  useEffect(() => {
    if (!user || !autoLockMinutes) return undefined;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, autoLockMinutes, resetInactivityTimer]);

  const login = useCallback(async (username, password) => {
    const u = await authApi.login(username, password);
    setUser(u);
    setLocked(false);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setLocked(false);
  }, []);

  const lock = useCallback(() => setLocked(true), []);

  const unlock = useCallback(async (password) => {
    await authApi.unlock(password);
    setLocked(false);
  }, []);

  const value = { user, loading, locked, autoLockMinutes, setAutoLockMinutes, login, logout, lock, unlock };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
