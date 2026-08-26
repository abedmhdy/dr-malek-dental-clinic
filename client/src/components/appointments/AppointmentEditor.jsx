import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PatientPicker from '../patients/PatientPicker';
import NewPatientQuickForm from '../patients/NewPatientQuickForm';
import TreatmentSelect from '../common/TreatmentSelect';
import { createAppointment, updateAppointment } from '../../api/appointments';
import { unwrapError } from '../../api/client';
import { addMinutesToTimeStr, todayStr } from '../../utils/dateFormat';
import { DURATION_OPTIONS } from '../../utils/treatments';
import { useUI } from '../../context/UIContext';

export default function AppointmentEditor({ appointment, initialPatient, initialDate, initialStartTime, onSaved, onCancel }) {
  const { t } = useTranslation();
  const { toast } = useUI();
  const navigate = useNavigate();
  const isEdit = Boolean(appointment);

  const [patient, setPatient] = useState(
    appointment?.patient || initialPatient || null
  );
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [date, setDate] = useState(appointment?.date || initialDate || todayStr());
  const [startTime, setStartTime] = useState(appointment?.startTime || initialStartTime || '09:00');
  const [duration, setDuration] = useState(appointment?.duration || 30);
  const [customEndTime, setCustomEndTime] = useState(appointment?.endTime || '');
  const [useCustomDuration, setUseCustomDuration] = useState(
    appointment ? !DURATION_OPTIONS.includes(appointment.duration) : false
  );
  const [treatmentType, setTreatmentType] = useState(appointment?.treatmentType || '');
  const [reason, setReason] = useState(appointment?.reason || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const endTime = useCustomDuration
    ? customEndTime || addMinutesToTimeStr(startTime, 30)
    : addMinutesToTimeStr(startTime, duration);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!patient) {
      setError(t('errors.patientRequired'));
      return;
    }
    if (!treatmentType.trim()) {
      setError(t('errors.treatmentRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      patientId: patient.id,
      date,
      startTime,
      endTime,
      duration: useCustomDuration ? diffMinutes(startTime, endTime) : duration,
      treatmentType,
      reason,
      notes,
    };

    try {
      const saved = isEdit
        ? await updateAppointment(appointment.id, payload)
        : await createAppointment(payload);
      toast.success(isEdit ? 'messages.appointmentUpdated' : 'messages.appointmentSaved');
      onSaved ? onSaved(saved) : navigate('/calendar');
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="login-error">{error}</div>}

      {patient ? (
        <div className="form-field">
          <label>{t('appointment.patient')}</label>
          <div className="flex items-center justify-between" style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
            <span>
              <strong>{patient.firstName} {patient.lastName}</strong>{' '}
              <span className="text-muted">{patient.patientNumber || ''} {patient.phone ? `· ${patient.phone}` : ''}</span>
            </span>
            {!isEdit && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPatient(null)}>
                {t('common.edit')}
              </button>
            )}
          </div>
        </div>
      ) : creatingPatient ? (
        <NewPatientQuickForm onCreated={setPatient} onCancel={() => setCreatingPatient(false)} />
      ) : (
        <div>
          <PatientPicker onSelect={setPatient} />
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCreatingPatient(true)}>
            + {t('appointment.createNewPatient')}
          </button>
        </div>
      )}

      {!creatingPatient && (
      <>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="form-field">
          <label htmlFor="appt-date">{t('appointment.date')}</label>
          <input id="appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="appt-start">{t('appointment.startTime')}</label>
          <input
            id="appt-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="appt-duration">{t('appointment.duration')}</label>
          <select
            id="appt-duration"
            value={useCustomDuration ? 'custom' : duration}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustomDuration(true);
              } else {
                setUseCustomDuration(false);
                setDuration(Number(e.target.value));
              }
            }}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {t('appointment.durationMinutes', { count: d })}
              </option>
            ))}
            <option value="custom">{t('appointment.customDuration')}</option>
          </select>
        </div>
        {useCustomDuration && (
          <div className="form-field">
            <label htmlFor="appt-end">{t('appointment.endTime')}</label>
            <input
              id="appt-end"
              type="time"
              value={customEndTime}
              onChange={(e) => setCustomEndTime(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      <div className="form-field" style={{ marginTop: 12 }}>
        <label>{t('appointment.treatmentType')}</label>
        <TreatmentSelect value={treatmentType} onChange={setTreatmentType} />
      </div>

      <div className="form-field">
        <label htmlFor="appt-notes">{t('appointment.notes')}</label>
        <textarea id="appt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      </>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('appointment.save')}
        </button>
      </div>
    </form>
  );
}

function diffMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
