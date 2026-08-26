import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext(null);

let toastId = 0;

export function UIProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolverRef = useRef(null);

  const pushToast = useCallback((type, messageKey, params) => {
    const id = ++toastId;
    const message = t(messageKey, params);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, [t]);

  const toast = {
    success: (key, params) => pushToast('success', key, params),
    error: (key, params) => pushToast('error', key, params),
  };

  const confirm = useCallback((messageKey, params) => {
    setConfirmState({ messageKey: messageKey, params });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirmResult = (result) => {
    setConfirmState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((tst) => (
          <div key={tst.id} className={`toast toast-${tst.type}`}>
            {tst.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="modal-overlay" role="presentation" onClick={() => handleConfirmResult(false)}>
          <div className="modal-card confirm-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-message">{t(confirmState.messageKey, confirmState.params)}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => handleConfirmResult(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => handleConfirmResult(true)} autoFocus>
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
