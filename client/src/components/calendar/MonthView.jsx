import { useTranslation } from 'react-i18next';
import { addDaysToDateStr, dayOfWeek, todayStr } from '../../utils/dateFormat';

export default function MonthView({ date, appointments, onDayClick }) {
  const { t } = useTranslation();
  const [year, month] = date.split('-').map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const startOffset = dayOfWeek(firstOfMonth); // 0 = Sunday
  const gridStart = addDaysToDateStr(firstOfMonth, -startOffset);
  const today = todayStr();

  const countsByDate = {};
  appointments.forEach((a) => {
    countsByDate[a.date] = (countsByDate[a.date] || 0) + 1;
  });

  const cells = Array.from({ length: 42 }, (_, i) => addDaysToDateStr(gridStart, i));
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((d) => t(`settings.days.${d}`));

  return (
    <div>
      <div className="month-grid" style={{ marginBottom: 6 }}>
        {dayLabels.map((label) => (
          <div key={label} className="month-day-header">{label}</div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((d) => {
          const isOutside = !d.startsWith(`${year}-${String(month).padStart(2, '0')}`);
          const count = countsByDate[d] || 0;
          return (
            <div
              key={d}
              className={`month-cell ${isOutside ? 'outside' : ''} ${d === today ? 'is-today' : ''}`}
              onClick={() => onDayClick(d)}
            >
              <div className="month-cell-date">{Number(d.slice(8, 10))}</div>
              {count > 0 && <span className="month-appt-dot">{count}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
