import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { createTreatmentPlan } from '../../api/finance';
import { unwrapError } from '../../api/client';

export default function TreatmentPlanForm({ patientId, onClose, onSaved }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const plan = await createTreatmentPlan({ patientId, title, description, totalPrice });
      onSaved(plan);
    } catch (err) {
      setError(t(unwrapError(err).messageKey));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t('finance.addTreatmentPlan')} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <div className="form-field">
          <label htmlFor="tp-title">{t('finance.title')}</label>
          <input id="tp-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="tp-price">{t('finance.totalPrice')} (₪)</label>
          <input
            id="tp-price"
            type="text"
            inputMode="decimal"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="tp-desc">{t('finance.description')} ({t('common.optional')})</label>
          <textarea id="tp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
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
