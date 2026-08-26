import { useTranslation } from 'react-i18next';

export default function EmptyState({ icon = '📋', messageKey, message, action }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p>{message || t(messageKey)}</p>
      {action}
    </div>
  );
}
