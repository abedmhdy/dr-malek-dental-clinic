import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { unwrapError } from '../../api/client';
import LanguageSwitcher from './LanguageSwitcher';

export default function LockScreen() {
  const { t } = useTranslation();
  const { unlock, logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await unlock(password);
      setPassword('');
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-lang-switcher">
          <LanguageSwitcher />
        </div>
        <div className="login-logo">🔒</div>
        <div className="login-doctor-name">{t('auth.sessionLocked')}</div>
        <div className="login-subheading">
          {user?.username} — {t('auth.enterPasswordToUnlock')}
        </div>
        {error && <div className="login-error">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="unlock-password">{t('auth.password')}</label>
            <input
              id="unlock-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t('common.saving') : t('auth.unlock')}
          </button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={logout}>
            {t('nav.logout')}
          </button>
        </form>
      </div>
    </div>
  );
}
