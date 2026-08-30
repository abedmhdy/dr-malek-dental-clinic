import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../utils/money';

export default function FinancialSummaryCard({ summary, onAddPayment, onAddTreatmentPlan }) {
  const { t } = useTranslation();
  const hasPlans = summary.plans.length > 0;
  const hasMultiplePlans = summary.plans.length > 1;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title">
        <span>{t('finance.treatmentPlans')}</span>
        <div className="flex gap-8 no-print">
          <button type="button" className="btn btn-sm btn-secondary" onClick={onAddTreatmentPlan}>
            + {t('finance.addTreatmentPlan')}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onAddPayment} disabled={!hasPlans}>
            + {t('finance.addPayment')}
          </button>
        </div>
      </div>

      {!hasPlans ? (
        <p className="text-muted">{t('finance.noTreatmentPlans')}</p>
      ) : (
        <>
          <div className="summary-grid" style={{ marginBottom: hasMultiplePlans ? 16 : 0 }}>
            <div className="summary-card">
              <div className="summary-card-value">{formatMoney(summary.overall.totalPrice, summary.overall.currency)}</div>
              <div className="summary-card-label">{t('finance.totalTreatmentCost')}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-value">{formatMoney(summary.overall.totalPaid, summary.overall.currency)}</div>
              <div className="summary-card-label">{t('finance.paid')}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-value">{formatMoney(summary.overall.remaining, summary.overall.currency)}</div>
              <div className="summary-card-label">{t('finance.remainingBalance')}</div>
            </div>
          </div>

          {hasMultiplePlans && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.treatmentPlan')}</th>
                    <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('common.status')}</th>
                    <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.totalPrice')}</th>
                    <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.paid')}</th>
                    <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.remainingBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.plans.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.title}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span className={`badge badge-${p.status === 'ACTIVE' ? 'SCHEDULED' : p.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED'}`}>
                          {t(`finance.status_${p.status}`)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{formatMoney(p.totalPrice, p.currency)}</td>
                      <td style={{ padding: '6px 8px' }}>{formatMoney(p.totalPaid, p.currency)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{formatMoney(p.remaining, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
