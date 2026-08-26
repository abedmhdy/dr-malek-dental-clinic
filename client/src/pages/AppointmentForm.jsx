import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppointmentEditor from '../components/appointments/AppointmentEditor';
import { getPatient } from '../api/patients';
import { PageSpinner } from '../components/common/Spinner';

export default function AppointmentForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientId = params.get('patientId');
  const [initialPatient, setInitialPatient] = useState(null);
  const [loading, setLoading] = useState(Boolean(patientId));

  useEffect(() => {
    if (!patientId) return;
    getPatient(patientId).then((p) => {
      setInitialPatient(p);
      setLoading(false);
    });
  }, [patientId]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 className="mt-0">{t('appointment.addAppointment')}</h2>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          {t('common.back')}
        </button>
      </div>
      <div className="card" style={{ maxWidth: 720 }}>
        <AppointmentEditor
          initialPatient={initialPatient}
          initialDate={params.get('date') || undefined}
          initialStartTime={params.get('time') || undefined}
          onSaved={(appt) => navigate(`/calendar?date=${appt.date}`)}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
