import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkDuplicates, createPatient } from '../../api/patients';
import { unwrapError } from '../../api/client';

// Minimal inline patient creation used from the Add Appointment flow
// (spec: quick add patient with first name / last name / phone), with
// duplicate detection before saving (spec: warn, never auto-merge).
export default function NewPatientQuickForm({ onCreated, onCancel }) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [duplicates, setDuplicates] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const doCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const patient = await createPatient({ firstName, lastName, phone });
      onCreated(patient);
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(t('errors.validation'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const candidates = await checkDuplicates({ firstName, lastName, phone });
      if (candidates.length > 0) {
        setDuplicates(candidates);
        setSubmitting(false);
        return;
      }
      await doCreate();
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
      setSubmitting(false);
    }
  };

  if (duplicates) {
    return (
      <div className="card" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}>
        <strong>{t('patient.possibleDuplicate')}</strong>
        <p className="text-muted" style={{ fontSize: 13 }}>{t('patient.possibleDuplicateHint')}</p>
        <ul style={{ margin: '10px 0' }}>
          {duplicates.map((d) => (
            <li key={d.id}>
              {d.firstName} {d.lastName} — {d.patientNumber} — {d.phone}
            </li>
          ))}
        </ul>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDuplicates(null)}>
            {t('common.back')}
          </button>
          <button type="button" className="btn btn-primary" onClick={doCreate} disabled={submitting}>
            {t('patient.continueAnyway')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {error && <div className="login-error">{error}</div>}
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="qp-first">{t('patient.firstName')}</label>
          <input id="qp-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="qp-last">{t('patient.lastName')}</label>
          <input id="qp-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="qp-phone">{t('patient.phone')}</label>
          <input id="qp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('patient.addPatient')}
        </button>
      </div>
    </form>
  );
}
