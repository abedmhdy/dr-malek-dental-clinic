import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TREATMENT_CODES } from '../../utils/treatments';

// Renders a dropdown of standard treatment types plus a free-text option,
// since the doctor must be able to enter custom treatment text (spec #17).
export default function TreatmentSelect({ value, onChange, id }) {
  const { t } = useTranslation();
  const isKnownCode = TREATMENT_CODES.includes(value);
  const [customMode, setCustomMode] = useState(value ? !isKnownCode : false);

  return (
    <div className="flex flex-col gap-8">
      <select
        id={id}
        value={customMode ? 'OTHER' : value || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'OTHER') {
            setCustomMode(true);
            onChange('');
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
      >
        <option value="" disabled>
          {t('appointment.treatmentType')}
        </option>
        {TREATMENT_CODES.map((code) => (
          <option key={code} value={code}>
            {t(`treatments.${code}`)}
          </option>
        ))}
      </select>
      {customMode && (
        <input
          type="text"
          value={value}
          placeholder={t('treatments.OTHER')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
