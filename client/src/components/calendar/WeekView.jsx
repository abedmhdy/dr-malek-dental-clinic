import { useTranslation } from 'react-i18next';
import { slotsForWeek, isWithinWorkingHours } from '../../utils/calendarUtils';
import { addDaysToDateStr, dayOfWeek, formatWeekdayShort, startOfWeek, todayStr } from '../../utils/dateFormat';

export default function WeekView({ date, appointments, workingHours, onSlotClick, onApptClick }) {
  const { t, i18n } = useTranslation();
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(weekStart, i));
  const slots = slotsForWeek(workingHours);
  const today = todayStr();

  const apptsByDaySlot = {};
  appointments.forEach((a) => {
    const key = `${a.date}_${nearestSlotFloor(a.startTime)}`;
    if (!apptsByDaySlot[key]) apptsByDaySlot[key] = [];
    apptsByDaySlot[key].push(a);
  });

  return (
    <div className="week-grid">
      <div className="week-day-header" />
      {days.map((d) => (
        <div key={d} className={`week-day-header ${d === today ? 'is-today' : ''}`}>
          {formatWeekdayShort(d, i18n.language)}
          <div>{d.slice(8, 10)}/{d.slice(5, 7)}</div>
        </div>
      ))}

      {slots.map((slot) => (
        <>
          <div className="time-label" key={`label-${slot}`}>{slot}</div>
          {days.map((d) => {
            const dayHours = workingHours[dayOfWeek(d)];
            const within = isWithinWorkingHours(dayHours, slot);
            const key = `${d}_${slot}`;
            const cellAppts = apptsByDaySlot[key] || [];
            return (
              <div
                key={key}
                className={`week-cell ${within ? '' : 'non-working'}`}
                onClick={() => within && onSlotClick(d, slot)}
              >
                {cellAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className={`slot-appointment status-${appt.status}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApptClick(appt);
                    }}
                  >
                    {appt.startTime} {appt.patient?.firstName}
                  </div>
                ))}
              </div>
            );
          })}
        </>
      ))}
    </div>
  );
}

function nearestSlotFloor(time) {
  const [h, m] = time.split(':').map(Number);
  const flooredMin = m < 30 ? 0 : 30;
  return `${String(h).padStart(2, '0')}:${String(flooredMin).padStart(2, '0')}`;
}
