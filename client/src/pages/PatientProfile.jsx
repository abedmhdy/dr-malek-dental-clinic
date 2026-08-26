import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  archivePatient,
  getPatient,
  getPatientAppointments,
  getPatientVisits,
} from '../api/patients';
import { patientHistoryExportUrl } from '../api/misc';
import { PageSpinner } from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import PhoneActions from '../components/common/PhoneActions';
import StatusBadge from '../components/common/StatusBadge';
import VisitModal from '../components/appointments/VisitModal';
import { calculateAge, formatFullDate, formatShortDate, todayStr } from '../utils/dateFormat';
import { useUI } from '../context/UIContext';

export default function PatientProfile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingVisit, setAddingVisit] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, appts, v] = await Promise.all([
      getPatient(id),
      getPatientAppointments(id),
      getPatientVisits(id),
    ]);
    setPatient(p);
    setAppointments(appts);
    setVisits(v);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !patient) return <PageSpinner />;

  const today = todayStr();
  const nextAppointment = appointments
    .filter((a) => !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(a.status))
    .filter((a) => a.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];

  const handleArchive = async () => {
    const ok = await confirm('patient.confirmArchive');
    if (!ok) return;
    await archivePatient(id);
    toast.success('messages.patientSaved');
    navigate('/patients');
  };

  return (
    <div>
      <div className="flex items-center justify-between no-print" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/patients')}>
          ← {t('common.back')}
        </button>
        <div className="flex gap-8">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            {t('common.print')}
          </button>
          <a className="btn btn-secondary" href={patientHistoryExportUrl(id)}>
            {t('common.export')}
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/patients/${id}/edit`)}>
            {t('common.edit')}
          </button>
          <button type="button" className="btn btn-danger" onClick={handleArchive}>
            {t('patient.archivePatient')}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="flex items-center gap-12">
            <div className="patient-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
              {patient.firstName?.[0]}{patient.lastName?.[0]}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{patient.firstName} {patient.lastName}</h2>
              <div className="text-muted">
                {patient.patientNumber}
                {patient.dateOfBirth && ` · ${calculateAge(patient.dateOfBirth)} ${t('common.years')}`}
              </div>
            </div>
          </div>
          <div>
            <PhoneActions phone={patient.phone} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 12.5 }}>{t('patient.nextAppointment')}</div>
            {nextAppointment ? (
              <strong>{formatShortDate(nextAppointment.date, i18n.language)} · {nextAppointment.startTime}</strong>
            ) : (
              <span className="text-muted">{t('patient.noNextAppointment')}</span>
            )}
          </div>
        </div>

        <div className="flex gap-8 no-print" style={{ marginTop: 18 }}>
          <button type="button" className="btn btn-primary" onClick={() => setAddingVisit(true)}>
            + {t('visit.addVisit')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
            + {t('nav.addAppointment')}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('appointment.appointment')}</div>
        {appointments.length === 0 ? (
          <EmptyState icon="🗓️" messageKey="empty.noAppointments" />
        ) : (
          appointments.slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{formatShortDate(a.date, i18n.language)} · {a.startTime} — {t(`treatments.${a.treatmentType}`, a.treatmentType)}</span>
              <StatusBadge status={a.status} />
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">{t('visit.visitHistory')}</div>
        {visits.length === 0 ? (
          <EmptyState icon="🩺" messageKey="empty.noVisits" />
        ) : (
          <div className="timeline">
            {visits.map((v) => (
              <div key={v.id} className="timeline-item">
                <div className="timeline-date">{formatFullDate(v.visitDate, i18n.language)} · {v.visitTime}</div>
                <div className="timeline-card">
                  <strong>{t(`treatments.${v.treatmentType}`, v.treatmentType)}</strong>
                  {(expandedVisit === v.id || !v.notes) && v.treatmentDescription && (
                    <p style={{ margin: '6px 0' }}>{v.treatmentDescription}</p>
                  )}
                  {expandedVisit === v.id && (
                    <>
                      {v.notes && <p style={{ margin: '6px 0' }}><strong>{t('visit.notes')}:</strong> {v.notes}</p>}
                      {v.nextVisitRecommendedDate && (
                        <p style={{ margin: '6px 0' }}>
                          <strong>{t('visit.nextVisitRecommended')}:</strong> {formatShortDate(v.nextVisitRecommendedDate, i18n.language)}
                        </p>
                      )}
                      <p className="text-muted" style={{ fontSize: 12 }}>
                        {t('visit.createdAt')}: {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </>
                  )}
                  {(v.notes || v.nextVisitRecommendedDate) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost no-print"
                      onClick={() => setExpandedVisit(expandedVisit === v.id ? null : v.id)}
                    >
                      {expandedVisit === v.id ? t('common.close') : t('common.viewAll')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addingVisit && (
        <VisitModal
          patient={patient}
          onClose={() => setAddingVisit(false)}
          onSaved={() => {
            setAddingVisit(false);
            load();
          }}
        />
      )}
    </div>
  );
}
