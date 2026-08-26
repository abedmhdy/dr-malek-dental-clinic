import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { checkDuplicates, createPatient, getPatient, updatePatient } from '../api/patients';
import { unwrapError } from '../api/client';
import { useUI } from '../context/UIContext';
import { PageSpinner } from '../components/common/Spinner';

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  secondaryPhone: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  address: '',
  notes: '',
};

export default function PatientForm() {
  const { t } = useTranslation();
  const { toast } = useUI();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [savedPatient, setSavedPatient] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    getPatient(id).then((p) => {
      setForm({ ...emptyForm, ...p });
      setLoading(false);
    });
  }, [id, isEdit]);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const doSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const saved = isEdit ? await updatePatient(id, form) : await createPatient(form);
      toast.success('messages.patientSaved');
      if (isEdit) {
        navigate(`/patients/${id}`);
      } else {
        setSavedPatient(saved);
      }
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (isEdit) {
      await doSave();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const candidates = await checkDuplicates({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      });
      if (candidates.length > 0) {
        setDuplicates(candidates);
        setSubmitting(false);
        return;
      }
      await doSave();
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  if (savedPatient) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <h3>{savedPatient.firstName} {savedPatient.lastName}</h3>
        <p className="text-muted">{savedPatient.patientNumber}</p>
        <div className="flex gap-8" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/patients/${savedPatient.id}`)}>
            {t('patient.openProfile')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/appointments/new?patientId=${savedPatient.id}`)}>
            {t('nav.addAppointment')}
          </button>
        </div>
      </div>
    );
  }

  if (duplicates) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '40px auto', background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}>
        <strong>{t('patient.possibleDuplicate')}</strong>
        <p className="text-muted" style={{ fontSize: 13 }}>{t('patient.possibleDuplicateHint')}</p>
        <ul>
          {duplicates.map((d) => (
            <li key={d.id}>
              <button type="button" className="btn-ghost" onClick={() => navigate(`/patients/${d.id}`)}>
                {d.firstName} {d.lastName} — {d.patientNumber} — {d.phone}
              </button>
            </li>
          ))}
        </ul>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDuplicates(null)}>
            {t('common.back')}
          </button>
          <button type="button" className="btn btn-primary" onClick={doSave} disabled={submitting}>
            {t('patient.continueAnyway')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 className="mt-0">{isEdit ? t('patient.editPatient') : t('patient.addPatient')}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
      </div>
      <form className="card" style={{ maxWidth: 760 }} onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="p-first">{t('patient.firstName')}</label>
            <input id="p-first" value={form.firstName} onChange={setField('firstName')} required />
          </div>
          <div className="form-field">
            <label htmlFor="p-last">{t('patient.lastName')}</label>
            <input id="p-last" value={form.lastName} onChange={setField('lastName')} required />
          </div>
          <div className="form-field">
            <label htmlFor="p-phone">{t('patient.phone')}</label>
            <input id="p-phone" value={form.phone} onChange={setField('phone')} required />
          </div>
          <div className="form-field">
            <label htmlFor="p-phone2">{t('patient.secondaryPhone')} ({t('common.optional')})</label>
            <input id="p-phone2" value={form.secondaryPhone || ''} onChange={setField('secondaryPhone')} />
          </div>
          <div className="form-field">
            <label htmlFor="p-dob">{t('patient.dateOfBirth')} ({t('common.optional')})</label>
            <input id="p-dob" type="date" value={form.dateOfBirth || ''} onChange={setField('dateOfBirth')} />
          </div>
          <div className="form-field">
            <label htmlFor="p-gender">{t('patient.gender')} ({t('common.optional')})</label>
            <select id="p-gender" value={form.gender || ''} onChange={setField('gender')}>
              <option value="">—</option>
              <option value="male">{t('patient.genderMale')}</option>
              <option value="female">{t('patient.genderFemale')}</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="p-email">{t('patient.email')} ({t('common.optional')})</label>
            <input id="p-email" type="email" value={form.email || ''} onChange={setField('email')} />
          </div>
          <div className="form-field">
            <label htmlFor="p-address">{t('patient.address')} ({t('common.optional')})</label>
            <input id="p-address" value={form.address || ''} onChange={setField('address')} />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="p-notes">{t('patient.notes')} ({t('common.optional')})</label>
          <textarea id="p-notes" value={form.notes || ''} onChange={setField('notes')} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
