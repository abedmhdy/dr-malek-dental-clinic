// Formats "YYYY-MM-DD" strings using each language's calendar/script via Intl,
// without ever constructing a UTC-shifted Date for storage — display only.

const LOCALE_MAP = { ar: 'ar', he: 'he', en: 'en-GB' };

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatFullDate(dateStr, lang) {
  const date = parseDateStr(dateStr);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateStr, lang) {
  const date = parseDateStr(dateStr);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatWeekdayShort(dateStr, lang) {
  const date = parseDateStr(dateStr);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-GB', { weekday: 'short' }).format(date);
}

export function formatMonthYear(dateStr, lang) {
  const date = parseDateStr(dateStr);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-GB', { month: 'long', year: 'numeric' }).format(date);
}

export function calculateAge(dateOfBirthStr) {
  if (!dateOfBirthStr) return null;
  const dob = parseDateStr(dateOfBirthStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateStr(dateStr, days) {
  const dt = parseDateStr(dateStr);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addMonthsToDateStr(dateStr, months) {
  const dt = parseDateStr(dateStr);
  dt.setMonth(dt.getMonth() + months);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfWeek(dateStr) {
  // Week starts Sunday to match the clinic's default working-week config.
  const dt = parseDateStr(dateStr);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayOfWeek(dateStr) {
  return parseDateStr(dateStr).getDay();
}

export function addMinutesToTimeStr(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(((total % 1440) + 1440) % 1440 / 60)).padStart(2, '0');
  const mm = String(((total % 60) + 60) % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
