import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import TreatmentSelect from '../common/TreatmentSelect';
import AppointmentEditor from './AppointmentEditor';
import { createVisit } from '../../api/visits';
import { unwrapError } from '../../api/client';
import { addDaysToDateStr, addMonthsToDateStr, todayStr } from '../../utils/dateFormat';
import { useUI } from '../../context/UIContext';

const NEXT_VISIT_OPTIONS = [
  { key: 'tomorrow', compute: (today) => addDaysToDateStr(today, 1) },
  { key: 'oneWeek', compute: (today) => addDaysToDateStr(today, 7) },
  { key: 'twoWeeks', compute: (today) => addDaysToDateStr(today, 14) },
  { key: 'threeWeeks', compute: (today) => addDaysToDateStr(today, 21) },
  { key: 'oneMonth', compute: (today) => addMonthsToDateStr(today, 1) },
];

// Implements the "Start Visit -> record treatment -> Complete Visit ->
// offer to schedule follow-up" workflow (spec #18 / #60), reused from the
// Dashboard, Calendar, and Patient Profile "Add Visit" action.
export default function VisitModal({ appointment, patient: patientProp, onClose, onSaved }) {
  const { t } = useTranslation();
  const { toast } = useUI();
  const patient = appointment?.patient || patientProp;
  const today = appointment?.date || todayStr();

  const [step, setStep] = useState('visit'); // visit -> followUpPrompt -> scheduleFollowUp
  const [treatmentType, setTreatmentType] = useState(appointment?.treatmentType || '');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [nextVisitOption, setNextVisitOption] = useState('');
  const [customNextDate, setCustomNextDate] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedVisit, setSavedVisit] = useState(null);

  const resolvedNextDate = () => {
    if (!nextVisitOption) return null;
    if (nextVisitOption === 'custom') return customNextDate || null;
    const opt = NEXT_VISIT_OPTIONS.find((o) => o.key === nextVisitOption);
    return opt ? opt.compute(today) : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!treatmentType.trim()) {
      setError(t('errors.treatmentRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextDate = resolvedNextDate();
      const visit = await createVisit({
        patientId: patient.id,
        appointmentId: appointment?.id || undefined,
        treatmentType,
        treatmentDescription,
        notes,
        nextVisitRecommendedDate: nextDate,
      });
      toast.success('messages.visitAdded');
      setSavedVisit(visit);
      if (nextDate) {
        setStep('followUpPrompt');
      } else {
        onSaved(visit);
      }
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'followUpPrompt') {
    return (
      <Modal title={t('visit.scheduleFollowUp')} onClose={() => onSaved(savedVisit)}>
        <p>{t('visit.scheduleFollowUpPrompt')}</p>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onSaved(savedVisit)}>
            {t('common.no')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setStep('scheduleFollowUp')}>
            {t('common.yes')}
          </button>
        </div>
      </Modal>
    );
  }

  if (step === 'scheduleFollowUp') {
    return (
      <Modal title={t('appointment.addAppointment')} onClose={() => onSaved(savedVisit)} large>
        <AppointmentEditor
          initialPatient={patient}
          initialDate={resolvedNextDate()}
          onSaved={() => onSaved(savedVisit)}
          onCancel={() => onSaved(savedVisit)}
        />
      </Modal>
    );
  }

  return (
    <Modal title={t('appointment.startVisit')} onClose={onClose} large>
      <p className="text-muted" style={{ marginTop: -8 }}>
        {patient?.firstName} {patient?.lastName} · {patient?.patientNumber}
      </p>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <div className="form-field">
          <label>{t('visit.treatmentType')}</label>
          <TreatmentSelect value={treatmentType} onChange={setTreatmentType} />
        </div>
        <div className="form-field">
          <label htmlFor="visit-desc">{t('visit.treatmentDescription')}</label>
          <textarea id="visit-desc" value={treatmentDescription} onChange={(e) => setTreatmentDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="visit-notes">{t('visit.notes')}</label>
          <textarea id="visit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-field">
          <label>{t('visit.nextVisitRecommended')}</label>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {NEXT_VISIT_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.key}
                className={`btn btn-sm ${nextVisitOption === opt.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNextVisitOption(opt.key)}
              >
                {t(`visit.nextVisitOptions.${opt.key}`)}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm ${nextVisitOption === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setNextVisitOption('custom')}
            >
              {t('visit.nextVisitOptions.custom')}
            </button>
          </div>
          {nextVisitOption === 'custom' && (
            <input
              type="date"
              value={customNextDate}
              onChange={(e) => setCustomNextDate(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('visit.completeVisit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
