import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import MonthView from '../components/calendar/MonthView';
import Modal from '../components/common/Modal';
import AppointmentEditor from '../components/appointments/AppointmentEditor';
import AppointmentDetail from '../components/appointments/AppointmentDetail';
import { PageSpinner } from '../components/common/Spinner';
import { listAppointments } from '../api/appointments';
import { getSettings } from '../api/misc';
import {
  addDaysToDateStr,
  addMonthsToDateStr,
  formatFullDate,
  formatMonthYear,
  startOfWeek,
  todayStr,
} from '../utils/dateFormat';

const VIEWS = ['day', 'week', 'month'];

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.includes(params.get('view')) ? params.get('view') : 'day';
  const date = params.get('date') || todayStr();

  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);

  const range = useMemo(() => computeRange(view, date), [view, date]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, s] = await Promise.all([
        listAppointments(range.from, range.to),
        settings ? Promise.resolve(settings) : getSettings(),
      ]);
      setAppointments(appts);
      if (!settings) setSettings(s);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const setView = (v) => setParams({ view: v, date });
  const setDate = (d) => setParams({ view, date: d });

  const goPrev = () => setDate(shiftDate(view, date, -1));
  const goNext = () => setDate(shiftDate(view, date, 1));
  const goToday = () => setDate(todayStr());

  const handleSlotClick = (d, time) => setNewSlot({ date: d, time });
  const handleApptClick = (appt) => setDetailAppt(appt);
  const handleDayClick = (d) => setParams({ view: 'day', date: d });

  const label = view === 'month' ? formatMonthYear(date, i18n.language) : formatFullDate(date, i18n.language);

  return (
    <div>
      <h2 className="mt-0">{t('calendar.title')}</h2>

      <div className="calendar-toolbar">
        <div className="calendar-view-switch">
          {VIEWS.map((v) => (
            <button key={v} type="button" className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {t(`calendar.${v}`)}
            </button>
          ))}
        </div>
        <div className="calendar-nav">
          <button type="button" className="icon-btn" onClick={goPrev} aria-label="previous">‹</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={goToday}>{t('calendar.today')}</button>
          <button type="button" className="icon-btn" onClick={goNext} aria-label="next">›</button>
        </div>
        <div className="calendar-current-label">{label}</div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setNewSlot({ date, time: '09:00' })}>
          + {t('appointment.addAppointment')}
        </button>
      </div>

      {loading || !settings ? (
        <PageSpinner />
      ) : (
        <>
          {view === 'day' && (
            <DayView
              date={date}
              appointments={appointments}
              workingHours={settings.workingHours}
              onSlotClick={handleSlotClick}
              onApptClick={handleApptClick}
            />
          )}
          {view === 'week' && (
            <WeekView
              date={date}
              appointments={appointments}
              workingHours={settings.workingHours}
              onSlotClick={handleSlotClick}
              onApptClick={handleApptClick}
            />
          )}
          {view === 'month' && (
            <MonthView date={date} appointments={appointments} onDayClick={handleDayClick} />
          )}
        </>
      )}

      {newSlot && (
        <Modal title={t('appointment.addAppointment')} onClose={() => setNewSlot(null)} large>
          <AppointmentEditor
            initialDate={newSlot.date}
            initialStartTime={newSlot.time}
            onSaved={() => {
              setNewSlot(null);
              load();
            }}
            onCancel={() => setNewSlot(null)}
          />
        </Modal>
      )}

      {detailAppt && (
        <AppointmentDetail
          appointment={detailAppt}
          onClose={() => setDetailAppt(null)}
          onChanged={() => {
            setDetailAppt(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function computeRange(view, date) {
  if (view === 'day') return { from: date, to: date };
  if (view === 'week') {
    const start = startOfWeek(date);
    return { from: start, to: addDaysToDateStr(start, 6) };
  }
  const [y, m] = date.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const start = addDaysToDateStr(first, -7);
  const nextMonthFirst = addMonthsToDateStr(first, 1);
  const end = addDaysToDateStr(nextMonthFirst, 6);
  return { from: start, to: end };
}

function shiftDate(view, date, dir) {
  if (view === 'day') return addDaysToDateStr(date, dir);
  if (view === 'week') return addDaysToDateStr(date, dir * 7);
  return addMonthsToDateStr(date, dir);
}
