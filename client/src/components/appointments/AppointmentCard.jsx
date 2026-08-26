import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import PhoneActions from '../common/PhoneActions';

// Shared appointment row used on the Dashboard, Calendar day list, and
// Patient profile — keeps the actions/status logic in exactly one place.
export default function AppointmentCard({ appointment, onStatusChange, onCancel, onEdit, onStartVisit, compact }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const patient = appointment.patient;
  const status = appointment.status;
  const isFinal = ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status);

  return (
    <div className="appointment-card">
      <div className="appointment-time">
        {appointment.startTime}
        {!compact && <div style={{ fontWeight: 400, fontSize: 11 }}>{appointment.endTime}</div>}
      </div>
      <div className="appointment-info">
        <div className="appointment-patient-name">
          {patient ? (
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: 0, fontWeight: 700, fontSize: 14.5, color: 'inherit' }}
              onClick={() => navigate(`/patients/${patient.id}`)}
            >
              {patient.firstName} {patient.lastName}
            </button>
          ) : (
            t('common.unknown')
          )}
        </div>
        <div className="appointment-meta">
          <span>{t(`treatments.${appointment.treatmentType}`, appointment.treatmentType)}</span>
          {patient && <PhoneActions phone={patient.phone} inline />}
        </div>
      </div>
      <StatusBadge status={status} />
      <div className="appointment-actions">
        {!isFinal && status === 'SCHEDULED' && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => onStatusChange(appointment, 'ARRIVED')}>
            {t('appointment.markArrived')}
          </button>
        )}
        {!isFinal && status === 'ARRIVED' && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => onStatusChange(appointment, 'IN_TREATMENT')}>
            {t('appointment.markInTreatment')}
          </button>
        )}
        {!isFinal && (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => onStartVisit(appointment)}>
            {t('appointment.startVisit')}
          </button>
        )}
        {!isFinal && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => onEdit(appointment)}>
            {t('common.edit')}
          </button>
        )}
        {!isFinal && (
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onCancel(appointment)}>
            {t('appointment.cancelAppointment')}
          </button>
        )}
      </div>
    </div>
  );
}
