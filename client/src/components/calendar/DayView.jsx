import { useTranslation } from 'react-i18next';
import EmptyState from '../common/EmptyState';
import { slotsForDay } from '../../utils/calendarUtils';
import { dayOfWeek } from '../../utils/dateFormat';

export default function DayView({ date, appointments, workingHours, onSlotClick, onApptClick }) {
  const { t } = useTranslation();
  const dayHours = workingHours[dayOfWeek(date)];
  const slots = slotsForDay(dayHours);

  if (slots.length === 0) {
    return <EmptyState icon="🌙" messageKey="settings.closed" />;
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
