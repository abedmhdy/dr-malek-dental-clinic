import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../api/misc';
import { setAppointmentStatus, cancelAppointment } from '../api/appointments';
import { formatFullDate } from '../utils/dateFormat';
import AppointmentCard from '../components/appointments/AppointmentCard';
import EmptyState from '../components/common/EmptyState';
import { PageSpinner } from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import AppointmentEditor from '../components/appointments/AppointmentEditor';
import VisitModal from '../components/appointments/VisitModal';
import { useUI } from '../context/UIContext';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAppt, setEditingAppt] = useState(null);
  const [visitAppt, setVisitAppt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDashboardSummary();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) return <PageSpinner />;

  const handleStatusChange = async (appt, status) => {
    await setAppointmentStatus(appt.id, status);
    load();
  };

  const handleCancel = async (appt) => {
    const ok = await confirm('confirm.cancelAppointment');
    if (!ok) return;
    await cancelAppointment(appt.id);
    toast.success('messages.appointmentCancelled');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <div>
          <h2 className="mt-0">{t('dashboard.title')}</h2>
          <div className="text-muted">{formatFullDate(data.today, i18n.language)}</div>
        </div>
        <div className="flex gap-8">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/appointments/new')}>
            + {t('nav.addAppointment')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/patients/new')}>
            + {t('nav.addPatient')}
          </button>
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: 20 }}>
        <SummaryCard value={data.counts.today} label={t('dashboard.summaryToday')} />
        <SummaryCard value={data.counts.upcoming7Days} label={t('dashboard.summaryUpcoming')} />
        <SummaryCard value={data.counts.totalPatients} label={t('dashboard.summaryTotalPatients')} />
        <SummaryCard value={data.counts.completedToday} label={t('dashboard.summaryCompleted')} />
        <SummaryCard value={data.counts.cancelledToday} label={t('dashboard.summaryCancelled')} />
        {/* Total outstanding balance and today's received payments are
            intentionally not shown here — the doctor wants those figures
            kept inside each patient's own profile, not surfaced as
            clinic-wide numbers on the home page. */}
      </div>

      <div className="card">
        <div className="card-title">
          <span>{t('dashboard.todaysAppointments')}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => navigate('/calendar')}>
            {t('common.viewAll')}
          </button>
        </div>
        {data.todayAppointments.length === 0 ? (
          <EmptyState icon="🗓️" messageKey="empty.noAppointmentsToday" />
        ) : (
          data.todayAppointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onStatusChange={handleStatusChange}
              onCancel={handleCancel}
              onEdit={setEditingAppt}
              onStartVisit={setVisitAppt}
            />
          ))
        )}
      </div>

      {editingAppt && (
        <Modal title={t('appointment.editAppointment')} onClose={() => setEditingAppt(null)}>
          <AppointmentEditor
            appointment={editingAppt}
            onSaved={() => {
              setEditingAppt(null);
              load();
            }}
            onCancel={() => setEditingAppt(null)}
          />
        </Modal>
      )}

      {visitAppt && (
        <VisitModal
          appointment={visitAppt}
          onClose={() => setVisitAppt(null)}
          onSaved={() => {
            setVisitAppt(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ value, label }) {
  return (
    <div className="summary-card">
      <div className="summary-card-value">{value}</div>
      <div className="summary-card-label">{label}</div>
    </div>
  );
}
