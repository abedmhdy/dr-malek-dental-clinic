import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { createPayment, updatePayment } from '../../api/finance';
import { unwrapError } from '../../api/client';
import { formatMoney } from '../../utils/money';
import { todayStr } from '../../utils/dateFormat';
import { PAYMENT_METHODS } from '../../utils/treatments';
import { useUI } from '../../context/UIContext';

// Records a new payment, or edits an existing one (payment prop supplied).
// Handles the "exceeds remaining balance" flow: the server rejects the
// first attempt with a 409 and the exact remaining amount; we show that
// as a confirm dialog and only resubmit with override:true if the doctor
// explicitly agrees — an overpayment is never saved silently.
export default function PaymentForm({ patientId, plans, visits, payment, onClose, onSaved }) {
  const { t } = useTranslation();
  const { confirm } = useUI();
  const isEdit = Boolean(payment);

  const [treatmentPlanId, setTreatmentPlanId] = useState(payment?.treatmentPlanId || plans?.[0]?.id || '');
  const [amount, setAmount] = useState(payment?.amount || '');
  const [paymentDate, setPaymentDate] = useState(payment?.paymentDate || todayStr());
  const [paymentMethod, setPaymentMethod] = useState(payment?.paymentMethod || '');
  const [visitId, setVisitId] = useState(payment?.visitId || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans?.find((p) => p.id === Number(treatmentPlanId));

  const submit = async (override) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        patientId,
        treatmentPlanId: Number(treatmentPlanId),
        amount,
        paymentDate,
        paymentMethod: paymentMethod || undefined,
        visitId: visitId || undefined,
        notes: notes || undefined,
        override,
      };
      const saved = isEdit ? await updatePayment(payment.id, payload) : await createPayment(payload);
      onSaved(saved);
    } catch (err) {
      const { messageKey, details } = unwrapError(err);
      if (messageKey === 'errors.paymentExceedsBalance' && !override) {
        const ok = await confirm('finance.overpaymentWarning', {
          amount: formatMoney(amount, selectedPlan?.currency),
          remaining: formatMoney(details?.remaining, selectedPlan?.currency),
        });
        if (ok) {
          await submit(true);
          return;
        }
      } else {
        setError(t(messageKey));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!treatmentPlanId) {
      setError(t('errors.treatmentPlanRequired'));
      return;
    }
    submit(false);
  };

  return (
    <Modal title={isEdit ? t('finance.editPayment') : t('finance.addPayment')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}

        <div className="form-field">
          <label htmlFor="pay-plan">{t('finance.treatmentPlan')}</label>
          <select id="pay-plan" value={treatmentPlanId} onChange={(e) => setTreatmentPlanId(e.target.value)} disabled={isEdit} required>
            <option value="" disabled>
              {t('finance.selectTreatmentPlan')}
            </option>
            {(plans || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {t('finance.remainingBalance')}: {formatMoney(p.remaining, p.currency)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="pay-amount">{t('finance.amount')}</label>
            <input
              id="pay-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="pay-date">{t('common.date')}</label>
            <input id="pay-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="pay-method">{t('finance.paymentMethod')}</label>
            <select id="pay-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`finance.method_${m}`)}
                </option>
              ))}
            </select>
          </div>
          {visits && visits.length > 0 && (
            <div className="form-field">
              <label htmlFor="pay-visit">{t('finance.relatedVisit')}</label>
              <select id="pay-visit" value={visitId} onChange={(e) => setVisitId(e.target.value)}>
                <option value="">{t('finance.none')}</option>
                {visits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.visitDate} — {v.treatmentType}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="pay-notes">{t('common.notes')}</label>
          <textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
