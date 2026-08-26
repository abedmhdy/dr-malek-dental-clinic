import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function normalizeForWhatsapp(phone) {
  // Strips spaces/dashes; WhatsApp click-to-chat needs digits only (no leading 0 assumptions
  // are made here since we don't know the doctor's country code — wa.me still works with
  // the local number for numbers that include their full dialing prefix).
  return (phone || '').replace(/[^\d+]/g, '');
}

// Makes a patient's phone easy to copy, and offers an explicit WhatsApp
// button that opens a chat in the browser — it never sends anything itself.
export default function PhoneActions({ phone, inline = false }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!phone) return null;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  };

  const waHref = `https://wa.me/${normalizeForWhatsapp(phone)}`;

  if (inline) {
    return (
      <span className="flex items-center gap-8" onClick={(e) => e.stopPropagation()}>
        <span>{phone}</span>
        <button type="button" className="btn-ghost btn-sm" onClick={handleCopy} title={t('common.copy')}>
          {copied ? '✓' : '📋'}
        </button>
        <a href={waHref} target="_blank" rel="noopener noreferrer" title={t('common.whatsapp')}>
          💬
        </a>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <span>{phone}</span>
      <button type="button" className="btn btn-sm btn-secondary" onClick={handleCopy}>
        {copied ? t('common.copied') : t('common.copy')}
      </button>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
        {t('common.whatsapp')}
      </a>
    </div>
  );
}
