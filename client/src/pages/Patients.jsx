import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { listPatients } from '../api/patients';
import { PageSpinner } from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { calculateAge } from '../utils/dateFormat';

export default function Patients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPatients(page, 20);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 className="mt-0">{t('patient.patients')}</h2>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/patients/new')}>
          + {t('patient.addPatient')}
        </button>
      </div>

      {loading || !data ? (
        <PageSpinner />
      ) : data.items.length === 0 ? (
        <EmptyState icon="🧑‍🤝‍🧑" messageKey="empty.noPatients" />
      ) : (
        <>
          {data.items.map((p) => (
            <div key={p.id} className="patient-list-item" role="button" tabIndex={0} onClick={() => navigate(`/patients/${p.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/patients/${p.id}`)}>
              <div className="flex items-center gap-12">
                <div className="patient-avatar">{p.firstName?.[0]}{p.lastName?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.firstName} {p.lastName}</div>
                  <div className="text-muted" style={{ fontSize: 12.5 }}>
                    {p.patientNumber} · {p.phone}
                    {p.dateOfBirth && ` · ${calculateAge(p.dateOfBirth)} ${t('common.years')}`}
                  </div>
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p.id}`); }}>
                {t('patient.openProfile')}
              </button>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('calendar.previous')}
              </button>
              <span className="text-muted">{page} / {totalPages}</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t('calendar.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
