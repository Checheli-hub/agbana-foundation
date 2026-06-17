import { createContext, useCallback, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = "info", duration = 4000 }) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast],
  );

  const confirm = useCallback(
    ({ message, confirmLabel = "OK", cancelLabel = "Cancel" } = {}) => {
      return new Promise((resolve) => {
        const id = Date.now() + Math.random();

        const onConfirm = () => {
          resolve(true);
          removeToast(id);
        };

        const onCancel = () => {
          resolve(false);
          removeToast(id);
        };

        setToasts((t) => [
          ...t,
          {
            id,
            message,
            type: "confirm",
            onConfirm,
            onCancel,
            confirmLabel,
            cancelLabel,
          },
        ]);
      });
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            role={t.type === "confirm" ? "dialog" : "status"}
          >
            <div className="toast-message">{t.message}</div>
            {t.type === "confirm" ? (
              <div className="toast-actions">
                <button
                  type="button"
                  className="toast-button"
                  onClick={t.onCancel}
                >
                  {t.cancelLabel}
                </button>
                <button
                  type="button"
                  className="toast-button toast-button-primary"
                  onClick={t.onConfirm}
                >
                  {t.confirmLabel}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
