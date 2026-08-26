import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import LockScreen from './LockScreen';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', labelKey: 'nav.dashboard', end: true },
  { to: '/calendar', icon: '📅', labelKey: 'nav.calendar' },
  { to: '/patients', icon: '🧑‍🤝‍🧑', labelKey: 'nav.patients' },
  { to: '/patients/new', icon: '➕', labelKey: 'nav.addPatient' },
  { to: '/appointments/new', icon: '🗓️', labelKey: 'nav.addAppointment' },
  { to: '/search', icon: '🔍', labelKey: 'nav.search' },
  { to: '/settings', icon: '⚙️', labelKey: 'nav.settings' },
];

export default function AppLayout() {
  const { t } = useTranslation();
  const { user, logout, lock, locked } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (locked && user) {
    return <LockScreen />;
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} role="presentation" />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🦷</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">{user?.fullNameEn ? doctorNameFor(user) : 'Dr. Malek Abu Sholdom'}</div>
            <div className="sidebar-brand-sub">{t('common.clinicManagementSystem')}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-link" onClick={lock}>
            <span className="sidebar-icon">🔒</span>
            {t('auth.lock')}
          </button>
          <button type="button" className="sidebar-link" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn no-print sidebar-toggle-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="menu"
          >
            ☰
          </button>
          <div className="topbar-title" />
          <div className="topbar-actions">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function doctorNameFor(user) {
  const lang = document.documentElement.lang;
  if (lang === 'ar') return user.fullNameAr;
  if (lang === 'he') return user.fullNameHe;
  return user.fullNameEn;
}
