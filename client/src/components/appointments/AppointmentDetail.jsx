import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import PhoneActions from '../common/PhoneActions';
import AppointmentEditor from './AppointmentEditor';
import VisitModal from './VisitModal';
import { cancelAppointment, setAppointmentStatus } from '../../api/appointments';
import { useUI } from '../../context/UIContext';

export default function AppointmentDetail({ appointment, onClose, onChanged }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const [editing, setEditing] = useState(false);
  const [startingVisit, setStartingVisit] = useState(false);
  const patient = appointment.patient;
  const isFinal = ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status);

  const handleStatus = async (status) => {
    await setAppointmentStatus(appointment.id, status);
    onChanged();
  };

  const handleCancel = async () => {
    const ok = await confirm('confirm.cancelAppointment');
    if (!ok) return;
    await cancelAppointment(appointment.id);
    toast.success('messages.appointmentCancelled');
    onChanged();
  };

  if (startingVisit) {
    return <VisitModal appointment={appointment} onClose={() => setStartingVisit(false)} onSaved={onChanged} />;
  }

  if (editing) {
    return (
      <Modal title={t('appointment.editAppointment')} onClose={() => setEditing(false)} large>
        <AppointmentEditor appointment={appointment} onSaved={onChanged} onCancel={() => setEditing(false)} />
      </Modal>
    );
  }

  return (
    <Modal title={t('appointment.appointment')} onClose={onClose}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 18 }}>{appointment.startTime} – {appointment.endTime}</strong>
        <StatusBadge status={appointment.status} />
      </div>

      {patient && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="flex items-center justify-between">
            <div>
              <strong>{patient.firstName} {patient.lastName}</strong>
              <div className="text-muted" style={{ fontSize: 12.5 }}>{patient.patientNumber}</div>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => navigate(`/patients/${patient.id}`)}>
              {t('appointment.openPatientProfile')}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <PhoneActions phone={patient.phone} />
          </div>
        </div>
      )}

      <p><strong>{t('appointment.treatmentType')}:</strong> {t(`treatments.${appointment.treatmentType}`, appointment.treatmentType)}</p>
      {appointment.notes && <p><strong>{t('appointment.notes')}:</strong> {appointment.notes}</p>}

      {!isFinal && (
        <div className="flex gap-8" style={{ flexWrap: 'wrap', marginTop: 16 }}>
          {appointment.status === 'SCHEDULED' && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleStatus('ARRIVED')}>
              {t('appointment.markArrived')}
            </button>
          )}
          {appointment.status === 'ARRIVED' && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleStatus('IN_TREATMENT')}>
              {t('appointment.markInTreatment')}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleStatus('NO_SHOW')}>
            {t('appointment.markNoShow')}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setStartingVisit(true)}>
            {t('appointment.startVisit')}
          </button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>
            {t('appointment.reschedule')}
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={handleCancel}>
            {t('appointment.cancelAppointment')}
          </button>
        </div>
      )}
    </Modal>
  );
}
