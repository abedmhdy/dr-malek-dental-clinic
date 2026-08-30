import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import PaymentForm from './PaymentForm';
import { formatMoney } from '../../utils/money';
import { formatShortDate } from '../../utils/dateFormat';
import { voidPayment } from '../../api/finance';
import { unwrapError } from '../../api/client';
import { useUI } from '../../context/UIContext';

export default function PaymentsList({ patientId, payments, plans, visits, onChanged }) {
  const { t, i18n } = useTranslation();
  const { toast, confirm } = useUI();
  const [editingPayment, setEditingPayment] = useState(null);
  const [voidingPayment, setVoidingPayment] = useState(null);

  const handleVoidClick = async (payment) => {
    const ok = await confirm('confirm.voidPayment');
    if (!ok) return;
    setVoidingPayment(payment);
  };

  return (
    <div className="card">
      <div className="card-title">{t('finance.paymentHistory')}</div>

      {payments.length === 0 ? (
        <EmptyState icon="💳" messageKey="finance.noPayments" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('common.date')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.treatmentPlan')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.amount')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.paymentMethod')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.relatedVisit')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }}>{t('finance.balanceAfterPayment')}</th>
                <th style={{ textAlign: 'start', padding: '6px 8px' }} className="no-print">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: p.voidedAt ? 0.55 : 1 }}>
                  <td style={{ padding: '6px 8px' }}>{formatShortDate(p.paymentDate, i18n.language)}</td>
                  <td style={{ padding: '6px 8px' }}>{p.treatmentPlan?.title}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, textDecoration: p.voidedAt ? 'line-through' : 'none' }}>
                    {formatMoney(p.amount, p.treatmentPlan?.currency)}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{p.paymentMethod ? t(`finance.method_${p.paymentMethod}`) : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{p.visit ? `${p.visit.visitDate} — ${p.visit.treatmentType}` : '—'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {p.voidedAt ? (
                      <span className="badge badge-CANCELLED">{t('finance.voided')}</span>
                    ) : (
                      formatMoney(p.balanceAfterPayment, p.treatmentPlan?.currency)
                    )}
                  </td>
                  <td style={{ padding: '6px 8px' }} className="no-print">
                    {!p.voidedAt && (
                      <div className="flex gap-8">
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingPayment(p)}>
                          {t('common.edit')}
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => handleVoidClick(p)}>
                          {t('finance.voidPayment')}
                        </button>
                      </div>
                    )}
                    {p.voidedAt && p.voidedReason && (
                      <span className="text-muted" style={{ fontSize: 12 }} title={p.voidedReason}>
                        {p.voidedReason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPayment && (
        <PaymentForm
          patientId={patientId}
          plans={plans}
          visits={visits}
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSaved={() => {
            setEditingPayment(null);
            toast.success('messages.paymentUpdated');
            onChanged();
          }}
        />
      )}

      {voidingPayment && (
        <VoidPaymentDialog
          payment={voidingPayment}
          onClose={() => setVoidingPayment(null)}
          onVoided={() => {
            setVoidingPayment(null);
            toast.success('messages.paymentVoided');
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function VoidPaymentDialog({ payment, onClose, onVoided }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!reason.trim()) {
      setError(t('errors.voidReasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await voidPayment(payment.id, reason);
      onVoided();
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t('finance.voidPayment')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <p>
          {t('finance.amount')}: <strong>{formatMoney(payment.amount, payment.treatmentPlan?.currency)}</strong>
        </p>
        <div className="form-field">
          <label htmlFor="void-reason">{t('finance.voidReason')}</label>
          <textarea id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-danger" disabled={submitting}>
            {submitting ? t('common.saving') : t('finance.voidPayment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
