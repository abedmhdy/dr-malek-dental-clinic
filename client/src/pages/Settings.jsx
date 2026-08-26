import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings, updateSettings, listBackups, createBackup, backupDownloadUrl, todaysAppointmentsExportUrl } from '../api/misc';
import { unwrapError } from '../api/client';
import { useUI } from '../context/UIContext';
import { PageSpinner } from '../components/common/Spinner';
import { DURATION_OPTIONS } from '../utils/treatments';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

const AUTO_LOCK_OPTIONS = [5, 10, 15, 30, 0];

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useUI();
  const [settings, setSettings] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, b] = await Promise.all([getSettings(), listBackups()]);
    setSettings(s);
    setBackups(b);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !settings) return <PageSpinner />;

  const setField = (field) => (e) => setSettings((s) => ({ ...s, [field]: e.target.value }));

  const setWorkingHour = (day, patch) => {
    setSettings((s) => ({
      ...s,
      workingHours: { ...s.workingHours, [day]: { ...s.workingHours[day], ...patch } },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings({
        clinicNameEn: settings.clinicNameEn,
        clinicNameAr: settings.clinicNameAr,
        clinicNameHe: settings.clinicNameHe,
        doctorNameEn: settings.doctorNameEn,
        doctorNameAr: settings.doctorNameAr,
        doctorNameHe: settings.doctorNameHe,
        defaultAppointmentDuration: Number(settings.defaultAppointmentDuration),
        autoLockMinutes: Number(settings.autoLockMinutes),
        workingHours: settings.workingHours,
      });
      setSettings(updated);
      toast.success('messages.settingsSaved');
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    await createBackup();
    toast.success('messages.backupCreated');
    const b = await listBackups();
    setBackups(b);
  };

  return (
    <div>
      <h2 className="mt-0">{t('settings.title')}</h2>
      {error && <div className="login-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.doctorProfile')}</div>
        <div className="form-grid">
          <Field label={t('settings.doctorNameEn')} value={settings.doctorNameEn} onChange={setField('doctorNameEn')} />
          <Field label={t('settings.doctorNameAr')} value={settings.doctorNameAr} onChange={setField('doctorNameAr')} dir="rtl" />
          <Field label={t('settings.doctorNameHe')} value={settings.doctorNameHe} onChange={setField('doctorNameHe')} dir="rtl" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.clinicSettings')}</div>
        <div className="form-grid">
          <Field label={t('settings.clinicNameEn')} value={settings.clinicNameEn} onChange={setField('clinicNameEn')} />
          <Field label={t('settings.clinicNameAr')} value={settings.clinicNameAr} onChange={setField('clinicNameAr')} dir="rtl" />
          <Field label={t('settings.clinicNameHe')} value={settings.clinicNameHe} onChange={setField('clinicNameHe')} dir="rtl" />
          <div className="form-field">
            <label>{t('settings.appointmentDuration')}</label>
            <select value={settings.defaultAppointmentDuration} onChange={setField('defaultAppointmentDuration')}>
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{t('appointment.durationMinutes', { count: d })}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.workingHours')}</div>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const wh = settings.workingHours[day] || {};
          return (
            <div className="working-hours-row" key={day}>
              <strong>{t(`settings.days.${day}`)}</strong>
              <label className="flex items-center gap-8">
                <input
                  type="checkbox"
                  checked={!wh.closed}
                  onChange={(e) => setWorkingHour(day, e.target.checked ? { closed: false, open: wh.open || '09:00', close: wh.close || '18:00' } : { closed: true })}
                />
                {wh.closed ? t('settings.closed') : t('settings.open')}
              </label>
              {!wh.closed && (
                <>
                  <input type="time" value={wh.open || '09:00'} onChange={(e) => setWorkingHour(day, { open: e.target.value })} />
                  <input type="time" value={wh.close || '18:00'} onChange={(e) => setWorkingHour(day, { close: e.target.value })} />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.language')}</div>
        <LanguageSwitcher />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('settings.security')}</div>
        <div className="form-field" style={{ maxWidth: 260 }}>
          <label>{t('settings.autoLock')}</label>
          <select value={settings.autoLockMinutes} onChange={setField('autoLockMinutes')}>
            {AUTO_LOCK_OPTIONS.map((m) => (
              <option key={m} value={m}>{m === 0 ? t('settings.autoLockOff') : t('settings.autoLockMinutes', { count: m })}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions" style={{ marginBottom: 20 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      <div className="card">
        <div className="card-title">
          <span>{t('settings.backup')}</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleBackup}>
            {t('settings.createBackup')}
          </button>
        </div>
        <a href={todaysAppointmentsExportUrl()} className="btn btn-sm btn-secondary" style={{ marginBottom: 14, display: 'inline-block' }}>
          {t('common.export')} — {t('dashboard.todaysAppointments')}
        </a>
        {backups.length === 0 ? (
          <p className="text-muted">{t('settings.noBackups')}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {backups.map((b) => (
                <tr key={b.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0' }}>{b.name}</td>
                  <td style={{ padding: '8px 0' }} className="text-muted">{new Date(b.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '8px 0', textAlign: 'end' }}>
                    <a className="btn btn-sm btn-secondary" href={backupDownloadUrl(b.name)}>
                      {t('settings.downloadBackup')}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, dir }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input value={value || ''} onChange={onChange} dir={dir} />
    </div>
  );
}
