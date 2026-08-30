import { useTranslation } from 'react-i18next';
import EmptyState from '../common/EmptyState';
import { slotsForDay } from '../../utils/calendarUtils';
import { dayOfWeek } from '../../utils/dateFormat';

export default function DayView({ date, appointments, workingHours, onSlotClick, onApptClick }) {
  const { t } = useTranslation();
  const dayHours = workingHours[dayOfWeek(date)];
  const slots = slotsForDay(dayHours);

  // A day marked "closed" in Settings must still show any appointment that
  // actually exists on it — appointment creation has never been restricted
  // by working hours, so a closed day can genuinely have bookings (e.g. a
  // one-off exception). Hiding them here would make a real, existing
  // appointment invisible to the doctor, which is worse than an inaccurate
  // "closed" label. Only fall back to the plain closed message when there
  // is truly nothing to show.
  if (slots.length === 0) {
    if (appointments.length === 0) {
      return <EmptyState icon="🌙" messageKey="settings.closed" />;
    }
    return (
      <div>
        <EmptyState icon="🌙" messageKey="calendar.closedButHasAppointments" />
        <div className="day-grid" style={{ marginTop: 12 }}>
          {appointments
            .slice()
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((appt) => (
              <div className="day-grid-row" key={appt.id}>
                <div className="time-label">{appt.startTime}</div>
                <div className="time-slot">
                  <div
                    className={`slot-appointment status-${appt.status}`}
                    onClick={() => onApptClick(appt)}
                    title={`${appt.startTime}-${appt.endTime} ${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`}
                  >
                    {appt.startTime} · {appt.patient?.firstName} {appt.patient?.lastName} ·{' '}
                    {t(`treatments.${appt.treatmentType}`, appt.treatmentType)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  const apptsBySlot = {};
  appointments.forEach((a) => {
    const slotStart = nearestSlotFloor(a.startTime);
    if (!apptsBySlot[slotStart]) apptsBySlot[slotStart] = [];
    apptsBySlot[slotStart].push(a);
  });

  return (
    <div className="day-grid">
      {slots.map((slot) => (
        <div className="day-grid-row" key={slot}>
          <div className="time-label">{slot}</div>
          <div className="time-slot" onClick={() => onSlotClick(date, slot)}>
            {(apptsBySlot[slot] || []).map((appt) => (
              <div
                key={appt.id}
                className={`slot-appointment status-${appt.status}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onApptClick(appt);
                }}
                title={`${appt.startTime}-${appt.endTime} ${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`}
              >
                {appt.startTime} · {appt.patient?.firstName} {appt.patient?.lastName} · {t(`treatments.${appt.treatmentType}`, appt.treatmentType)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function nearestSlotFloor(time) {
  const [h, m] = time.split(':').map(Number);
  const flooredMin = m < 30 ? 0 : 30;
  return `${String(h).padStart(2, '0')}:${String(flooredMin).padStart(2, '0')}`;
}
