const SLOT_STEP_MINUTES = 30;

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Builds the list of "HH:mm" slot start times for one day given its working
// hours entry ({ open, close } or { closed: true }).
export function slotsForDay(dayHours) {
  if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) return [];
  const start = timeToMinutes(dayHours.open);
  const end = timeToMinutes(dayHours.close);
  const slots = [];
  for (let m = start; m < end; m += SLOT_STEP_MINUTES) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

// Builds the union slot range across a whole week's working hours, so a
// week view can share one consistent set of time rows.
export function slotsForWeek(workingHours) {
  let minStart = null;
  let maxEnd = null;
  for (let d = 0; d < 7; d += 1) {
    const day = workingHours[d];
    if (!day || day.closed || !day.open || !day.close) continue;
    const s = timeToMinutes(day.open);
    const e = timeToMinutes(day.close);
    if (minStart === null || s < minStart) minStart = s;
    if (maxEnd === null || e > maxEnd) maxEnd = e;
  }
  if (minStart === null) {
    minStart = timeToMinutes('09:00');
    maxEnd = timeToMinutes('18:00');
  }
  const slots = [];
  for (let m = minStart; m < maxEnd; m += SLOT_STEP_MINUTES) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function isWithinWorkingHours(dayHours, time) {
  if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) return false;
  const t = timeToMinutes(time);
  return t >= timeToMinutes(dayHours.open) && t < timeToMinutes(dayHours.close);
}

export { SLOT_STEP_MINUTES };
