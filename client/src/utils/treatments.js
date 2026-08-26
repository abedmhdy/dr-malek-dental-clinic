// Treatment catalog keys — labels come from the "treatments" i18n namespace.
// The doctor can also type free text (treated as a custom/"Other" value).
export const TREATMENT_CODES = [
  'EXAMINATION',
  'CLEANING',
  'ORTHODONTICS',
  'ORTHODONTIC_ADJUSTMENT',
  'WIRE_CHANGE',
  'ELASTIC_CHANGE',
  'FILLING',
  'ROOT_CANAL',
  'EXTRACTION',
  'CROWN',
  'WHITENING',
  'XRAY',
  'CONSULTATION',
  'FOLLOW_UP',
  'OTHER',
];

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'ARRIVED',
  'IN_TREATMENT',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

export const DURATION_OPTIONS = [15, 30, 45, 60];
