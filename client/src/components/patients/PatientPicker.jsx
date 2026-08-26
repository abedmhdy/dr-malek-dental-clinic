import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchPatients } from '../../api/misc';

// Typeahead patient selector. Calls onSelect({ id, firstName, lastName, phone })
// once the doctor picks a match from the dropdown.
export default function PatientPicker({ onSelect, selectedLabel }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await searchPatients(query.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="form-field" ref={boxRef} style={{ position: 'relative' }}>
      <label htmlFor="patient-picker">{t('appointment.selectPatient')}</label>
      <input
        id="patient-picker"
        type="text"
        value={selectedLabel || query}
        placeholder={t('search.placeholder')}
        onFocus={() => results.length && setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 30,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onSelect(p);
                setQuery('');
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'start',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <strong>{p.firstName} {p.lastName}</strong>
              <div className="text-muted" style={{ fontSize: 12 }}>
                {p.patientNumber} · {p.phone}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
