import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { unwrapError } from '../api/client';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/');
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
        <div className="login-logo">🦷</div>
        <div className="login-doctor-name">{doctorNameForLang()}</div>
        <div className="login-subheading">{t('common.clinicManagementSystem')}</div>

        {error && <div className="login-error" role="alert">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="username">{t('auth.username')}</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="password-field-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 10 }}>
            {submitting ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
}

function doctorNameForLang() {
  const lang = document.documentElement.lang;
  if (lang === 'ar') return 'د. مالك أبو شلظم';
  if (lang === 'he') return 'ד"ר מאלק אבו שלדום';
  return 'Dr. Malek Abu Sholdom';
}
