import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { searchPatients } from '../api/misc';
import EmptyState from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { formatShortDate } from '../utils/dateFormat';

export default function Search() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await searchPatients(value.trim());
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mt-0">{t('nav.search')}</h2>
      <div className="search-bar">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder={t('search.placeholder')}
        />
        {loading && <Spinner />}
      </div>

      {results && results.length === 0 && <EmptyState icon="🔍" messageKey="empty.noSearchResults" />}

      {results && results.length > 0 && (
        <div>
          {results.map((p) => (
            <div key={p.id} className="patient-list-item" role="button" tabIndex={0} onClick={() => navigate(`/patients/${p.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/patients/${p.id}`)}>
              <div className="flex items-center gap-12">
                <div className="patient-avatar">{p.firstName?.[0]}{p.lastName?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.firstName} {p.lastName}</div>
                  <div className="text-muted" style={{ fontSize: 12.5 }}>{p.patientNumber} · {p.phone}</div>
                </div>
              </div>
              <div className="text-muted" style={{ fontSize: 12.5, textAlign: 'end' }}>
                {t('patient.nextAppointment')}
                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                  {p.nextAppointment ? `${formatShortDate(p.nextAppointment.date, i18n.language)} · ${p.nextAppointment.startTime}` : t('patient.noNextAppointment')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
